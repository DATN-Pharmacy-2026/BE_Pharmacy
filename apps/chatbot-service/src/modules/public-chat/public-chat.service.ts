import { Injectable, Logger } from '@nestjs/common';
import { ConversationService } from '../conversation/conversation.service';
import { SafetyService } from '../safety/safety.service';
import { EmbeddingService } from '../rag/embedding.service';
import { LlmService } from '../chat/llm.service';
import { VectorStoreService } from '../rag/vector-store.service';
import { ProductSearchService } from '../chat/product-search.service';
import {
  PublicChatRequestDto,
  PublicChatResponseDto,
} from './dto/public-chat.dto';
import type { ChatProductSummary } from '../chat/dto/chat.dto';

type PublicIntent =
  | 'product.price'
  | 'product.stock'
  | 'product.usage'
  | 'policy.lookup'
  | 'health.sensitive'
  | 'unknown';

type RagContext = {
  id: string;
  title: string;
  category: string;
  source: string;
  content: string;
  score: number;
  payload?: Record<string, unknown>;
};

@Injectable()
export class PublicChatService {
  private readonly logger = new Logger(PublicChatService.name);

  private readonly systemPrompt = `Bạn là trợ lý tư vấn của hệ thống nhà thuốc.

Quy tắc:
- Trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu.
- Chỉ dựa trên CONTEXT và DỮ LIỆU HỆ THỐNG được cung cấp.
- Không tự bịa tên thuốc, giá bán, tồn kho hoặc công dụng.
- Không chẩn đoán bệnh.
- Không kê đơn thuốc.
- Không thay thế bác sĩ hoặc dược sĩ.
- Nếu câu hỏi liên quan đến mang thai, cho con bú, trẻ em, bệnh nền, dị ứng, quá liều, đau ngực, khó thở, hãy khuyên hỏi bác sĩ/dược sĩ.
- Nếu không đủ dữ liệu, nói rõ không đủ dữ liệu và đề xuất gặp nhân viên tư vấn.`;

  constructor(
    private readonly conversationService: ConversationService,
    private readonly safetyService: SafetyService,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreService: VectorStoreService,
    private readonly llmService: LlmService,
    private readonly productSearchService: ProductSearchService,
  ) {}

  async chat(dto: PublicChatRequestDto): Promise<PublicChatResponseDto> {
    const message = dto.message.trim();
    const conversationId = await this.conversationService.ensureConversation(
      'guest',
      message,
      dto.conversationId?.trim(),
    );
    await this.conversationService.appendMessage(conversationId, 'USER', message, {
      context: dto.context ?? null,
      channel: 'PUBLIC_RAG',
    });

    const intent = this.detectIntent(message);
    const safety = this.safetyService.checkSafety(message);
    if (safety.handoffRequired) {
      const response = await this.finalizeResponse(conversationId, {
        answer:
          'Câu hỏi này cần được dược sĩ hoặc bác sĩ tư vấn trực tiếp để bảo đảm an toàn. Bạn nên gặp nhân viên tư vấn trước khi sử dụng thuốc.',
        mode: 'HYBRID',
        intent: 'health.sensitive',
        conversationId,
        handoffRequired: true,
        warnings: ['Câu hỏi có yếu tố sức khỏe nhạy cảm, chatbot không tự tư vấn thay chuyên môn.'],
        suggestedActions: ['Gặp nhân viên tư vấn'],
      });
      return response;
    }

    if (intent === 'product.price') {
      const response = await this.handlePriceQuestion(message, conversationId, dto);
      return this.finalizeResponse(conversationId, response);
    }

    if (intent === 'product.stock') {
      const response = await this.handleStockQuestion(message, conversationId, dto);
      return this.finalizeResponse(conversationId, response);
    }

    let ragContexts: RagContext[] = [];
    let ragWarning = '';
    try {
      ragContexts = await this.searchKnowledgeContexts(
        message,
        intent === 'policy.lookup'
          ? ['faq', 'policy', 'general', 'safety']
          : ['product', 'faq', 'policy', 'general', 'safety'],
        5,
        intent === 'policy.lookup' ? 0.28 : 0.25,
      );
    } catch (error) {
      const technicalError = error instanceof Error ? error.message : String(error);
      ragWarning = 'Kho tri thức hiện chưa sẵn sàng để trả lời tự động.';
      this.logger.warn(`Knowledge search failed: ${technicalError}`);
    }

    if (!ragContexts.length) {
      return this.finalizeResponse(conversationId, {
        answer:
          'Hiện hệ thống chưa có đủ dữ liệu phù hợp để trả lời chính xác câu hỏi này. Bạn vui lòng gặp nhân viên tư vấn để được hỗ trợ thêm.',
        mode: 'RAG',
        intent,
        conversationId,
        handoffRequired: true,
        warnings: [
          ragWarning || 'Không tìm thấy ngữ cảnh phù hợp trong kho tri thức.',
        ],
        suggestedActions: ['Gặp nhân viên tư vấn'],
      });
    }

    const answer = await this.buildRagAnswer(message, ragContexts);
    return this.finalizeResponse(conversationId, {
      answer,
      mode: this.usesRealtimeData(intent) ? 'HYBRID' : 'RAG',
      intent,
      conversationId,
      handoffRequired: false,
      warnings: [],
      suggestedActions: [],
    });
  }

  private async handlePriceQuestion(
    message: string,
    conversationId: string,
    dto: PublicChatRequestDto,
  ): Promise<PublicChatResponseDto> {
    const products = await this.findProducts(message, dto.context?.branchId);
    if (!products.length) {
      return {
        answer:
          'Hiện hệ thống chưa tìm thấy sản phẩm phù hợp để báo giá. Bạn vui lòng kiểm tra lại tên sản phẩm hoặc gặp nhân viên tư vấn.',
        mode: 'HYBRID',
        intent: 'product.price',
        conversationId,
        handoffRequired: true,
        warnings: ['Không tìm thấy sản phẩm phù hợp trong danh mục công khai.'],
        suggestedActions: ['Gặp nhân viên tư vấn'],
      };
    }

    const product = this.pickBestProduct(products, dto.context?.productId);
    return {
      answer: `${product.name} hiện có giá tham khảo ${this.formatCurrency(product.price)}.`,
      mode: 'HYBRID',
      intent: 'product.price',
      conversationId,
      handoffRequired: false,
      warnings: [],
      suggestedActions: [],
    };
  }

  private async handleStockQuestion(
    message: string,
    conversationId: string,
    dto: PublicChatRequestDto,
  ): Promise<PublicChatResponseDto> {
    const products = await this.findProducts(message, dto.context?.branchId);
    if (!products.length) {
      return {
        answer:
          'Hiện hệ thống chưa tìm thấy sản phẩm phù hợp để kiểm tra tồn kho. Bạn vui lòng kiểm tra lại tên sản phẩm hoặc gặp nhân viên tư vấn.',
        mode: 'HYBRID',
        intent: 'product.stock',
        conversationId,
        handoffRequired: true,
        warnings: ['Không tìm thấy sản phẩm phù hợp trong danh mục công khai.'],
        suggestedActions: ['Gặp nhân viên tư vấn'],
      };
    }

    const product = this.pickBestProduct(products, dto.context?.productId);
    const stockText = this.buildStockAnswer(product, dto.context?.branchId);
    return {
      answer: `${product.name} ${stockText}`,
      mode: 'HYBRID',
      intent: 'product.stock',
      conversationId,
      handoffRequired: false,
      warnings: [],
      suggestedActions: [],
    };
  }

  private async findProducts(message: string, branchId?: string) {
    try {
      return await this.productSearchService.searchProducts(message, branchId);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Public product lookup failed: ${messageText}`);
      return [];
    }
  }

  private pickBestProduct(
    products: ChatProductSummary[],
    preferredProductId?: string,
  ): ChatProductSummary {
    if (preferredProductId) {
      const matched = products.find((product) => product.id === preferredProductId);
      if (matched) return matched;
    }
    return products[0];
  }

  private buildStockAnswer(
    product: ChatProductSummary,
    branchId?: string,
  ): string {
    if (!product.availableBranches.length) {
      return 'hiện chưa có dữ liệu còn hàng ở chi nhánh đang kiểm tra.';
    }

    if (branchId) {
      const total = product.availableBranches.reduce(
        (sum, item) => sum + Number(item.availableQty || 0),
        0,
      );
      return total > 0
        ? `đang còn hàng tại chi nhánh đã chọn với số lượng khả dụng khoảng ${this.formatQuantity(total)}.`
        : 'hiện chưa có sẵn hàng tại chi nhánh đã chọn.';
    }

    const branches = product.availableBranches
      .slice(0, 2)
      .map((item) => item.name)
      .join(', ');
    return `đang còn hàng tại ${branches}.`;
  }

  private async searchKnowledgeContexts(
    message: string,
    types: string[],
    topK: number,
    minScore: number,
  ): Promise<RagContext[]> {
    const queryEmbedding = await this.embeddingService.createEmbedding(
      message,
      'RETRIEVAL_QUERY',
    );
    const results = await this.vectorStoreService.searchSimilar(queryEmbedding, topK, {
      types,
      minScore,
    });
    return results.map((item) => ({
      id: item.id,
      score: item.score,
      title: item.title,
      category: item.category,
      source: item.source,
      content: item.content,
      payload: item.payload,
    }));
  }

  private async buildRagAnswer(
    message: string,
    ragContexts: RagContext[],
  ): Promise<string> {
    const contextText = ragContexts
      .map(
        (item, index) =>
          `[${index + 1}] loại=${item.category}; tiêu đề=${item.title}; nội dung=${item.content}`,
      )
      .join('\n');

    const userPrompt = `QUESTION:
${message}

CONTEXT:
${contextText}

Hãy trả lời ngắn gọn bằng tiếng Việt tự nhiên. Không nhắc tới file, chunk, source kỹ thuật hay điểm số tìm kiếm.`;

    try {
      return await this.llmService.generateAnswer(this.systemPrompt, userPrompt);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Public RAG LLM fallback triggered: ${messageText}`);
      return this.buildRagFallbackAnswer(ragContexts);
    }
  }

  private buildRagFallbackAnswer(ragContexts: RagContext[]): string {
    const best = ragContexts[0];
    const normalized = best.content.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 320) {
      return normalized;
    }
    return `${normalized.slice(0, 317)}...`;
  }

  private detectIntent(message: string): PublicIntent {
    const normalized = this.normalize(message);
    if (
      this.containsAny(normalized, [
        'mang thai',
        'cho con bu',
        'cho con bú',
        'tre em',
        'trẻ em',
        'benh nen',
        'bệnh nền',
        'di ung',
        'dị ứng',
        'qua lieu',
        'quá liều',
        'dau nguc',
        'đau ngực',
        'kho tho',
        'khó thở',
      ])
    ) {
      return 'health.sensitive';
    }

    if (this.containsAny(normalized, ['gia', 'bao nhieu tien', 'bao nhieu', 'muc gia'])) {
      return 'product.price';
    }

    if (this.containsAny(normalized, ['con hang', 'còn hàng', 'co ban khong', 'có bán không', 'het hang'])) {
      return 'product.stock';
    }

    if (
      this.containsAny(normalized, [
        'cong dung',
        'công dụng',
        'dung de lam gi',
        'dùng để làm gì',
        'cach dung',
        'cách dùng',
        'luu y',
        'lưu ý',
        'chi dinh',
        'chỉ định',
        'hoat chat',
        'hoạt chất',
      ])
    ) {
      return 'product.usage';
    }

    if (
      this.containsAny(normalized, [
        'doi tra',
        'đổi trả',
        'giao hang',
        'giao hàng',
        'hoan tien',
        'hoàn tiền',
        'thanh toan',
        'thanh toán',
        'chinh sach',
        'chính sách',
      ])
    ) {
      return 'policy.lookup';
    }

    return 'unknown';
  }

  private usesRealtimeData(intent: PublicIntent): boolean {
    return intent === 'product.price' || intent === 'product.stock';
  }

  private containsAny(text: string, patterns: string[]): boolean {
    return patterns.some((pattern) => text.includes(this.normalize(pattern)));
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private formatCurrency(value: number): string {
    return `${new Intl.NumberFormat('vi-VN').format(Math.round(value))}đ`;
  }

  private formatQuantity(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(Math.round(value));
  }

  private async finalizeResponse(
    conversationId: string,
    response: PublicChatResponseDto,
  ): Promise<PublicChatResponseDto> {
    const sanitizedWarnings = this.sanitizeWarnings(response.warnings);
    const sanitizedResponse: PublicChatResponseDto = {
      ...response,
      warnings: sanitizedWarnings,
    };

    await this.conversationService.appendMessage(
      conversationId,
      'ASSISTANT',
      sanitizedResponse.answer,
      {
        mode: sanitizedResponse.mode,
        intent: sanitizedResponse.intent,
        handoffRequired: sanitizedResponse.handoffRequired,
        warnings: sanitizedResponse.warnings,
        suggestedActions: sanitizedResponse.suggestedActions,
        channel: 'PUBLIC_RAG',
      },
    );
    return sanitizedResponse;
  }

  private sanitizeWarnings(warnings: string[]): string[] {
    if (!warnings.length) {
      return warnings;
    }

    return warnings.map((warning) =>
      this.isTechnicalWarning(warning)
        ? 'Kho tri thức hiện chưa sẵn sàng để trả lời tự động.'
        : warning,
    );
  }

  private isTechnicalWarning(warning: string): boolean {
    const normalized = warning.toLowerCase();
    return [
      'api key',
      'openai',
      'gemini',
      'qdrant',
      'embedding',
      'vector',
      'timeout',
      'econnrefused',
      'service unavailable',
      'fetch failed',
      'socket hang up',
      'invalid_argument',
    ].some((keyword) => normalized.includes(keyword));
  }
}
