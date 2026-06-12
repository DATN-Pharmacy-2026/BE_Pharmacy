import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingService } from '../rag/embedding.service';
import { VectorStoreService } from '../rag/vector-store.service';
import { SafetyService } from '../safety/safety.service';
import { ConversationService } from '../conversation/conversation.service';
import { HandoffService } from '../handoff/handoff.service';
import {
  ChatProductSummary,
  ChatResponseDto,
  ChatSource,
} from './dto/chat.dto';
import { LlmService } from './llm.service';
import { ProductSearchService } from './product-search.service';

type RagContext = {
  title: string;
  category: string;
  source: string;
  content: string;
  score: number;
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  private readonly systemPrompt = `Ban la chatbot ho tro khach hang cua he thong nha thuoc.

Quy tac:
- Chi tra loi dua tren CONTEXT duoc cung cap.
- Khong tu bia thong tin.
- Khong chan doan benh.
- Khong ke don thuoc.
- Khong tu van lieu dung chi tiet.
- Neu CONTEXT khong du, hay noi he thong chua co du du lieu.
- Neu cau hoi lien quan gia, ton kho, cong dung, hoat chat hoac san pham thi uu tien du lieu san pham truoc.
- Cau tra loi can ngan gon, de hieu, lich su.`;

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreService: VectorStoreService,
    private readonly llmService: LlmService,
    private readonly safetyService: SafetyService,
    private readonly conversationService: ConversationService,
    private readonly handoffService: HandoffService,
    private readonly productSearchService: ProductSearchService,
  ) {}

  async chat(
    userId: string,
    message: string,
    conversationId?: string,
    branchId?: string,
    topK = 5,
  ): Promise<ChatResponseDto> {
    const convId = await this.conversationService.ensureConversation(
      userId,
      message,
      conversationId,
    );
    await this.conversationService.appendMessage(convId, 'USER', message);

    const safety = this.safetyService.checkSafety(message);
    if (safety.handoffRequired) {
      return this.finalizeResponse(
        convId,
        await this.buildSafetyHandoffResponse(userId, convId, message),
      );
    }

    const intent = this.classifyIntent(message);
    let productResults: ChatProductSummary[] = [];

    if (intent.product) {
      productResults = await this.productSearchService.searchProducts(
        message,
        branchId,
      );

      if (productResults.length > 0 && !intent.policy) {
        return this.finalizeResponse(convId, {
          answer: this.buildProductAnswer(productResults, branchId),
          sources: [
            {
              title: 'Du lieu san pham PharmPlus',
              source: 'internal-product-catalog',
            },
          ],
          products: productResults,
          handoffRequired: false,
          conversationId: convId,
        });
      }

      if (productResults.length === 0 && !intent.policy) {
        return this.finalizeResponse(convId, {
          answer:
            'Hien tai he thong chua tim thay san pham phu hop trong du lieu nha thuoc.',
          sources: [],
          products: [],
          handoffRequired: false,
          conversationId: convId,
        });
      }
    }

    const ragContexts = await this.searchRagContexts(message, topK);
    if (intent.policy || productResults.length === 0) {
      if (!ragContexts.length || ragContexts[0].score < 0.35) {
        if (productResults.length > 0) {
          return this.finalizeResponse(convId, {
            answer: this.buildProductAnswer(productResults, branchId),
            sources: [
              {
                title: 'Du lieu san pham PharmPlus',
                source: 'internal-product-catalog',
              },
            ],
            products: productResults,
            handoffRequired: false,
            conversationId: convId,
          });
        }

        return this.finalizeResponse(
          convId,
          await this.buildInsufficientContextResponse(userId, convId, message),
        );
      }
    }

    const answer = await this.buildCombinedAnswer(message, productResults, ragContexts);
    const response: ChatResponseDto = {
      answer,
      sources: this.buildSources(productResults, ragContexts, topK),
      products: productResults,
      handoffRequired: false,
      conversationId: convId,
    };

    return this.finalizeResponse(convId, response);
  }

  private async buildSafetyHandoffResponse(
    userId: string,
    conversationId: string,
    question: string,
  ): Promise<ChatResponseDto> {
    const ticket = await this.handoffService.createTicket({
      conversationId,
      userId,
      question,
      handoffReason: 'MEDICAL_SAFETY',
    });

    return {
      answer:
        'Cau hoi cua ban can duoc duoc si kiem tra de dam bao an toan. He thong da ghi nhan yeu cau va chuyen toi nhan vien chuyen mon.',
      sources: [],
      products: [],
      handoffRequired: true,
      handoffReason: 'MEDICAL_SAFETY',
      handoffTicketId: ticket.id,
      handoffTicketCode: ticket.ticketCode,
      conversationId,
    };
  }

  private async buildInsufficientContextResponse(
    userId: string,
    conversationId: string,
    question: string,
  ): Promise<ChatResponseDto> {
    const ticket = await this.handoffService.createTicket({
      conversationId,
      userId,
      question,
      handoffReason: 'INSUFFICIENT_CONTEXT',
    });

    return {
      answer:
        'He thong chua co du du lieu lien quan de tra loi chinh xac. Ban vui long lien he duoc si de duoc ho tro them.',
      sources: [],
      products: [],
      handoffRequired: true,
      handoffReason: 'INSUFFICIENT_CONTEXT',
      handoffTicketId: ticket.id,
      handoffTicketCode: ticket.ticketCode,
      conversationId,
    };
  }

  private async finalizeResponse(
    conversationId: string,
    response: ChatResponseDto,
  ): Promise<ChatResponseDto> {
    await this.conversationService.appendMessage(
      conversationId,
      'ASSISTANT',
      response.answer,
      {
        sources: response.sources,
        products: response.products ?? [],
        handoffRequired: response.handoffRequired,
        handoffReason: response.handoffReason ?? null,
        handoffTicketId: response.handoffTicketId ?? null,
        handoffTicketCode: response.handoffTicketCode ?? null,
      },
    );
    return response;
  }

  private classifyIntent(message: string): { product: boolean; policy: boolean } {
    const normalized = this.normalizeText(message);
    const productKeywords = [
      'gia',
      'bao nhieu tien',
      'con hang',
      'co ban',
      'thuoc',
      'san pham',
      'cong dung',
      'hoat chat',
      'lieu dung',
      'vitamin',
      'may do',
      'paracetamol',
      'amoxicillin',
      'huyet ap',
      'ton kho',
      'chi nhanh',
    ];
    const policyKeywords = [
      'doi tra',
      'giao hang',
      'thanh toan',
      'tai khoan',
      'don hang',
      'huy don',
      'hoan tien',
      'van chuyen',
    ];

    return {
      product: productKeywords.some((keyword) => normalized.includes(keyword)),
      policy: policyKeywords.some((keyword) => normalized.includes(keyword)),
    };
  }

  private async searchRagContexts(message: string, topK: number): Promise<RagContext[]> {
    const queryEmbedding = await this.embeddingService.createEmbedding(
      message,
      'RETRIEVAL_QUERY',
    );
    return this.vectorStoreService.searchSimilar(queryEmbedding, topK);
  }

  private async buildCombinedAnswer(
    message: string,
    productResults: ChatProductSummary[],
    ragContexts: RagContext[],
  ): Promise<string> {
    const productContext = productResults.length
      ? this.buildProductContext(productResults)
      : 'Khong co du lieu san pham phu hop.';
    const ragContextText = ragContexts.length
      ? ragContexts
          .map(
            (context, index) =>
              `[${index + 1}] title=${context.title}; category=${context.category}; source=${context.source}; content=${context.content}`,
          )
          .join('\n')
      : 'Khong co du lieu RAG phu hop.';

    const userPrompt = `QUESTION:\n${message}\n\nPRODUCT_CONTEXT:\n${productContext}\n\nPOLICY_CONTEXT:\n${ragContextText}\n\nHay tra loi ngan gon bang tieng Viet khong dau, uu tien du lieu san pham cho gia va ton kho, khong hien thi JSON hay duong dan file.`;

    try {
      return await this.llmService.generateAnswer(this.systemPrompt, userPrompt);
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `LLM unavailable, returning fallback answer: ${messageText}`,
      );
      if (productResults.length > 0) {
        const productAnswer = this.buildProductAnswer(productResults);
        if (ragContexts.length === 0) {
          return productAnswer;
        }
        return `${productAnswer}\n\nThem thong tin lien quan: ${this.buildFallbackAnswer(
          ragContexts,
        )}`;
      }
      return this.buildFallbackAnswer(ragContexts);
    }
  }

  private buildProductContext(products: ChatProductSummary[]): string {
    return products
      .slice(0, 3)
      .map((product) => {
        const branches =
          product.availableBranches.length > 0
            ? product.availableBranches
                .map((branch) => `${branch.name} (${branch.availableQty})`)
                .join(', ')
            : 'khong co ton kho san sang';
        return [
          `Ten: ${product.name}`,
          `Gia: ${this.formatCurrency(product.price)}`,
          product.category ? `Danh muc: ${product.category}` : '',
          product.activeIngredient
            ? `Hoat chat: ${product.activeIngredient}`
            : '',
          product.description ? `Mo ta: ${product.description}` : '',
          product.usage ? `Cong dung: ${product.usage}` : '',
          `Ton kho: ${branches}`,
          product.requiresPrescription
            ? 'Canh bao: san pham nen dung theo chi dinh cua bac si hoac duoc si.'
            : '',
        ]
          .filter(Boolean)
          .join('. ');
      })
      .join('\n');
  }

  private buildProductAnswer(
    products: ChatProductSummary[],
    branchId?: string,
  ): string {
    if (products.length === 1) {
      const product = products[0];
      const stockText = this.buildStockText(product, branchId);
      const description = product.description || product.usage || '';
      const prescriptionText = this.buildPrescriptionText(product);
      return [
        `${product.name} hien co gia ${this.formatCurrency(product.price)}.`,
        stockText,
        description ? this.toSentence(description) : '',
        prescriptionText,
      ]
        .filter(Boolean)
        .join(' ');
    }

    const lines = products.slice(0, 3).map((product, index) => {
      const stockLabel = product.isAvailable ? 'con hang' : 'tam het hang';
      const prescriptionText = product.requiresPrescription
        ? ' - can dung theo chi dinh cua bac si/duoc si'
        : '';
      return `${index + 1}. ${product.name} - ${this.formatCurrency(
        product.price,
      )} - ${stockLabel}${prescriptionText}`;
    });

    return `Nha thuoc tim thay mot so san pham phu hop:\n${lines.join('\n')}`;
  }

  private buildStockText(product: ChatProductSummary, branchId?: string): string {
    if (product.availableBranches.length === 0) {
      return 'Hien chua ghi nhan ton kho san sang cho san pham nay.';
    }

    if (branchId) {
      return 'San pham dang con hang tai chi nhanh ban da chon.';
    }

    const branchNames = product.availableBranches
      .map((branch) => branch.name)
      .slice(0, 2)
      .join(', ');
    return `San pham dang con hang tai ${branchNames}.`;
  }

  private buildPrescriptionText(product: ChatProductSummary): string {
    if (!product.requiresPrescription) {
      return '';
    }
    return 'San pham nay nen su dung theo chi dinh cua bac si hoac tu van truc tiep tu duoc si.';
  }

  private buildSources(
    productResults: ChatProductSummary[],
    ragContexts: RagContext[],
    topK: number,
  ): ChatSource[] {
    const sources: ChatSource[] = [];
    if (productResults.length > 0) {
      sources.push({
        title: 'Du lieu san pham PharmPlus',
        source: 'internal-product-catalog',
      });
    }

    sources.push(
      ...ragContexts.slice(0, topK).map((context) => ({
        title: context.title,
        source: context.source,
      })),
    );

    return sources;
  }

  private buildFallbackAnswer(
    contexts: Array<{
      title: string;
      category: string;
      source: string;
      content: string;
    }>,
  ): string {
    const highlights = contexts
      .slice(0, 3)
      .map((contextItem, index) => {
        const content = contextItem.content.replace(/\s+/g, ' ').trim();
        const summary =
          content.length > 220 ? `${content.slice(0, 217)}...` : content;
        return `${index + 1}. ${contextItem.title}: ${summary}`;
      })
      .join('\n');

    return `Hien tai he thong AI dang qua tai tam thoi. Du lieu lien quan trong he thong:\n${highlights}\n\nNeu can tu van chuyen mon hoac thong tin chi tiet hon, ban vui long lien he duoc si.`;
  }

  private formatCurrency(value: number): string {
    return `${new Intl.NumberFormat('vi-VN').format(Math.round(value))}d`;
  }

  private toSentence(value: string): string {
    const clean = value.replace(/\s+/g, ' ').trim();
    if (!clean) {
      return '';
    }
    return clean.endsWith('.') ? clean : `${clean}.`;
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}
