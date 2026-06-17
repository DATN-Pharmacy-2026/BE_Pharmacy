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
import type {
  ChatProductAvailabilityBranch,
  ChatProductSummary,
} from '../chat/dto/chat.dto';

type PublicIntent =
  | 'product.price'
  | 'product.stock'
  | 'product.usage'
  | 'policy.lookup'
  | 'symptom.product_search'
  | 'symptom.stock_lookup'
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

  private readonly dangerousSymptomPatterns = [
    'dau bung du doi',
    'dau dau du doi',
    'sot cao',
    'sot keo dai',
    'non nhieu',
    'non lien tuc',
    'di ngoai ra mau',
    'tieu ra mau',
    'kho tho',
    'tho rit',
    'dau nguc',
  ];

  private readonly stockKeywords = [
    'con khong',
    'con hang',
    'co ban khong',
    'het hang',
  ];

  private readonly symptomKeywords = [
    'dau bung',
    'dau da day',
    'tieu chay',
    'dau dau',
    'ho',
    'sot',
    'cam',
    'cum',
    'so mui',
    'nghet mui',
    'viem hong',
    'dau hong',
    'tao bon',
    'non',
    'buon non',
    'di ngoai',
    'di ung',
    'met moi',
    'nhuc moi',
  ];

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

    if (this.containsDangerousSymptom(message)) {
      return this.finalizeResponse(
        conversationId,
        this.buildDangerousSymptomResponse(conversationId),
      );
    }

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
        warnings: [
          'Câu hỏi có yếu tố sức khỏe nhạy cảm, chatbot không tự tư vấn thay chuyên môn.',
        ],
        suggestedActions: ['Gặp nhân viên tư vấn'],
      });
      return response;
    }

    if (intent === 'health.sensitive') {
      return this.finalizeResponse(conversationId, {
        answer:
          'Câu hỏi này cần được dược sĩ hoặc bác sĩ tư vấn trực tiếp để bảo đảm an toàn. Bạn nên gặp nhân viên tư vấn trước khi sử dụng thuốc.',
        mode: 'HYBRID',
        intent: 'health.sensitive',
        conversationId,
        handoffRequired: true,
        warnings: [
          'Câu hỏi có yếu tố sức khỏe nhạy cảm, chatbot không tự tư vấn thay chuyên môn.',
        ],
        suggestedActions: ['Gặp nhân viên tư vấn'],
      });
    }

    if (intent === 'product.price') {
      const response = await this.handlePriceQuestion(message, conversationId, dto);
      return this.finalizeResponse(conversationId, response);
    }

    if (intent === 'product.stock') {
      const response = await this.handleStockQuestion(message, conversationId, dto);
      return this.finalizeResponse(conversationId, response);
    }

    if (
      intent === 'symptom.product_search' ||
      intent === 'symptom.stock_lookup'
    ) {
      const response = await this.handleSymptomQuestion(
        message,
        intent,
        conversationId,
        dto,
      );
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

  private async handleSymptomQuestion(
    message: string,
    intent: 'symptom.product_search' | 'symptom.stock_lookup',
    conversationId: string,
    dto: PublicChatRequestDto,
  ): Promise<PublicChatResponseDto> {
    const symptomQuery = this.extractSymptomQuery(message);
    const branchId = dto.context?.branchId;
    const products = await this.findProductsBySymptom(message, symptomQuery, branchId);

    if (!products.length) {
      return {
        answer:
          'Tôi chưa tìm thấy sản phẩm phù hợp trong hệ thống. Bạn có thể mô tả rõ hơn triệu chứng hoặc chuyển sang nhân viên/dược sĩ để được hỗ trợ.',
        mode: 'HYBRID',
        intent,
        conversationId,
        handoffRequired: true,
        warnings: ['Chưa tìm thấy sản phẩm liên quan trong dữ liệu hệ thống.'],
        suggestedActions: ['Gặp nhân viên tư vấn'],
      };
    }

    return {
      answer:
        intent === 'symptom.stock_lookup'
          ? this.buildSymptomStockAnswer(products, branchId)
          : this.buildSymptomProductAnswer(products),
      mode: 'HYBRID',
      intent,
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

  private async findProductsBySymptom(
    message: string,
    symptomQuery: string,
    branchId?: string,
  ): Promise<ChatProductSummary[]> {
    try {
      const catalogMatches = await this.productSearchService.searchProductsBySymptom(
        message,
        symptomQuery,
        branchId,
      );
      if (catalogMatches.length) {
        return catalogMatches.slice(0, 5);
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Symptom product lookup failed: ${messageText}`);
    }

    try {
      const ragMatches = await this.searchKnowledgeContexts(
        `san pham lien quan ${symptomQuery || message}`,
        ['product'],
        8,
        0.22,
      );
      const productIds = ragMatches
        .map((item) => item.payload?.productId)
        .filter((productId): productId is string => typeof productId === 'string')
        .slice(0, 5);

      if (!productIds.length) {
        return [];
      }

      const products = await this.productSearchService.getProductsByIds(
        productIds,
        branchId,
      );
      return products.slice(0, 5);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Symptom RAG fallback failed: ${messageText}`);
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

  private buildSymptomProductAnswer(products: ChatProductSummary[]): string {
    const lines = products.slice(0, 3).map((product, index) => {
      const details = [
        product.category ? `nhóm ${product.category}` : '',
        product.usage ? `thông tin liên quan: ${this.truncate(product.usage, 90)}` : '',
        product.activeIngredient
          ? `hoạt chất: ${this.truncate(product.activeIngredient, 50)}`
          : '',
      ].filter(Boolean);

      return `${index + 1}. ${product.name}${details.length ? ` (${details.join('; ')})` : ''}`;
    });

    return [
      'Tôi có tìm thấy một số sản phẩm liên quan trong hệ thống để bạn tham khảo:',
      ...lines,
      'Đây chỉ là các sản phẩm có thông tin liên quan đến triệu chứng bạn nêu, không thay thế tư vấn của dược sĩ hoặc bác sĩ.',
    ].join('\n');
  }

  private buildSymptomStockAnswer(
    products: ChatProductSummary[],
    branchId?: string,
  ): string {
    const lines = products.slice(0, 3).map((product, index) => {
      const stockLabel = this.describeBranchAvailability(
        product.availableBranches,
        branchId,
      );
      return `${index + 1}. ${product.name}: ${stockLabel}`;
    });

    return [
      'Tôi có tìm thấy một số sản phẩm liên quan trong hệ thống:',
      ...lines,
      'Danh sách này chỉ mang tính tham khảo theo dữ liệu sản phẩm và tồn kho hiện có, bạn nên trao đổi thêm với dược sĩ để chọn sản phẩm phù hợp.',
    ].join('\n');
  }

  private describeBranchAvailability(
    availableBranches: ChatProductAvailabilityBranch[],
    branchId?: string,
  ): string {
    if (!availableBranches.length) {
      return 'hiện chưa ghi nhận còn hàng';
    }

    if (branchId) {
      const total = availableBranches.reduce(
        (sum, branch) => sum + Number(branch.availableQty || 0),
        0,
      );
      return total > 0
        ? `còn khoảng ${this.formatQuantity(total)} tại chi nhánh đã chọn`
        : 'hiện chưa ghi nhận còn hàng tại chi nhánh đã chọn';
    }

    const branches = availableBranches
      .slice(0, 2)
      .map((branch) => `${branch.name}${branch.availableQty > 0 ? ` (${this.formatQuantity(branch.availableQty)})` : ''}`)
      .join(', ');
    return branches ? `còn hàng tại ${branches}` : 'hiện chưa ghi nhận còn hàng';
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
          `[${index + 1}] loai=${item.category}; tieu de=${item.title}; noi dung=${item.content}`,
      )
      .join('\n');

    const userPrompt = `QUESTION:
${message}

CONTEXT:
${contextText}

Hay tra loi ngan gon bang tieng Viet tu nhien. Khong nhac toi file, chunk, source ky thuat hay diem so tim kiem.`;

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
    const symptomQuery = this.extractSymptomQuery(message);
    const symptomRelated = this.isSymptomRelated(normalized, symptomQuery);
    const isPolicyQuestion = this.containsAny(normalized, [
      'doi tra',
      'tra hang',
      'hoan tien',
      'giao hang',
      'van chuyen',
      'thanh toan',
      'cod',
      'chinh sach',
      'don hang',
      'kiem tra don hang',
      'theo doi don',
      'ma don',
      'mo seal',
      'mo niem phong',
      'mat khau',
      'quen mat khau',
      'tai khoan',
      'dang nhap',
    ]);

    if (
      this.containsAny(normalized, [
        'mang thai',
        'cho con bu',
        'tre em',
        'benh nen',
        'di ung',
        'qua lieu',
        'dau nguc',
        'kho tho',
      ])
    ) {
      return 'health.sensitive';
    }

    if (isPolicyQuestion) {
      return 'policy.lookup';
    }

    if (symptomRelated && this.containsAny(normalized, this.stockKeywords)) {
      return 'symptom.stock_lookup';
    }

    if (symptomRelated) {
      return 'symptom.product_search';
    }

    if (this.containsAny(normalized, ['gia', 'bao nhieu tien', 'bao nhieu', 'muc gia'])) {
      return 'product.price';
    }

    if (this.containsAny(normalized, this.stockKeywords)) {
      return 'product.stock';
    }

    if (
      this.containsAny(normalized, [
        'cong dung',
        'dung de lam gi',
        'thuoc nay dung de lam gi',
        'lam gi',
        'cach dung',
        'luu y',
        'chi dinh',
        'hoat chat',
      ])
    ) {
      return 'product.usage';
    }

    return 'unknown';
  }

  private isSymptomRelated(normalizedMessage: string, symptomQuery: string): boolean {
    const phraseKeywords = this.symptomKeywords.filter((keyword) => keyword.includes(' '));
    if (this.containsAny(normalizedMessage, phraseKeywords)) {
      return true;
    }

    const normalizedSymptom = this.normalize(symptomQuery);
    if (!normalizedSymptom) {
      return false;
    }

    const tokens = new Set(
      normalizedSymptom.split(' ').filter((token) => token.length > 1),
    );
    return [
      'dau',
      'ho',
      'sot',
      'non',
      'tieu',
      'cam',
      'cum',
      'bung',
      'day',
    ].some((token) => tokens.has(token));
  }

  private extractSymptomQuery(message: string): string {
    return this.normalize(message)
      .replace(/\b(thuoc|san pham|co|khong|con|hang|ban|khong|nen|dung|gi|nao|cho toi|toi|muon|hoi|kiem tra|xem|giup|voi|khong a|khong vay|khong nhi)\b/g, ' ')
      .replace(/\b(co ban|con hang|con khong|co thuoc)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private containsDangerousSymptom(message: string): boolean {
    const normalized = this.normalize(message);
    return this.containsAny(normalized, this.dangerousSymptomPatterns);
  }

  private buildDangerousSymptomResponse(
    conversationId: string,
  ): PublicChatResponseDto {
    return {
      answer:
        'Triệu chứng bạn mô tả có dấu hiệu cần được dược sĩ hoặc bác sĩ đánh giá trực tiếp. Tôi không nên gợi ý sản phẩm trong trường hợp này. Bạn nên đi khám hoặc liên hệ dược sĩ/nhân viên tư vấn sớm để được hỗ trợ an toàn hơn.',
      mode: 'HYBRID',
      intent: 'health.sensitive',
      conversationId,
      handoffRequired: true,
      warnings: ['Triệu chứng có dấu hiệu cảnh báo, cần chuyển hỗ trợ chuyên môn.'],
      suggestedActions: ['Gặp nhân viên tư vấn'],
    };
  }

  private usesRealtimeData(intent: PublicIntent): boolean {
    return (
      intent === 'product.price' ||
      intent === 'product.stock' ||
      intent === 'symptom.stock_lookup'
    );
  }

  private containsAny(text: string, patterns: string[]): boolean {
    return patterns.some((pattern) => text.includes(this.normalize(pattern)));
  }

  private normalize(value: string): string {
    return value
      .replace(/[đĐ]/g, 'd')
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

  private truncate(value: string, maxLength: number): string {
    const text = value.replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.slice(0, maxLength - 3)}...`;
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
