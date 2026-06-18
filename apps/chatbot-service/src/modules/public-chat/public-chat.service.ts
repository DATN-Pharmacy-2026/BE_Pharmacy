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
  type PublicChatAnswerContextDto,
  type PublicChatMetadataDto,
  type PublicChatMode,
  type PublicChatResolvedEntitiesDto,
} from './dto/public-chat.dto';
import type {
  ChatProductAvailabilityBranch,
  ChatProductSummary,
} from '../chat/dto/chat.dto';

type PublicIntent =
  | 'branch.lookup'
  | 'product.price'
  | 'product.stock'
  | 'product.usage'
  | 'policy.lookup'
  | 'symptom.product_search'
  | 'symptom.stock_lookup'
  | 'health.sensitive'
  | 'health.emergency'
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

type AnswerPlan = {
  intent: PublicIntent;
  mode: PublicChatMode;
  facts: Record<string, unknown>;
  resolvedEntities: PublicChatResolvedEntitiesDto;
  rules: string[];
  handoffRequired: boolean;
  warnings: string[];
  suggestedActions: string[];
  llmDirective: string;
  fallbackAnswer: string;
};

type BranchSummary = {
  id: string;
  name: string;
  code?: string;
  address?: string;
  phone?: string;
};

@Injectable()
export class PublicChatService {
  private readonly logger = new Logger(PublicChatService.name);

  private readonly naturalAnswerPrompt =
    'Ban la tro ly nha thuoc PharmPlus. Hay tra loi tu nhien, ngan gon, de hieu cho khach hang. Chi su dung du lieu trong FACTS. Khong tu bia them gia, ton kho, dia chi, chinh sach, cong dung, ten san pham hoac metadata noi bo. Neu FACTS khong du thong tin, hay noi ro he thong chua co du lieu va de xuat gap nhan vien tu van. Khong hien thi sourcePath, ten file ky thuat, score, metadata hoac JSON.';

  private readonly dangerousMedicalPatterns = [
    'ngo doc',
    'sui bot mep',
    'co giat',
    'kho tho',
    'dau nguc',
    'uong qua lieu',
    'di ung nang',
    'soc thuoc',
    'dau bung du doi',
    'sot cao',
    'non nhieu',
    'di ngoai ra mau',
    'ngat',
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

    const normalizedMessage = this.normalizeVi(message);
    const plan = await this.buildAnswerPlan(message, normalizedMessage, dto);
    const answer = await this.generateNaturalAnswer(plan, message);

    return this.finalizeResponse(conversationId, {
      answer,
      mode: plan.mode,
      intent: plan.intent,
      conversationId,
      handoffRequired: plan.handoffRequired,
      warnings: plan.warnings,
      suggestedActions: plan.suggestedActions,
      metadata: {
        answerContext: {
          intent: plan.intent,
          facts: plan.facts,
          rules: plan.rules,
        },
        facts: plan.facts,
        resolvedEntities: plan.resolvedEntities,
      },
    });
  }

  private async buildAnswerPlan(
    message: string,
    normalizedMessage: string,
    dto: PublicChatRequestDto,
  ): Promise<AnswerPlan> {
    if (this.detectDangerousMedicalQuestion(normalizedMessage)) {
      return this.buildEmergencyPlan();
    }

    const safety = this.safetyService.checkSafety(message);
    if (safety.handoffRequired) {
      return this.buildSensitiveSafetyPlan(safety.matchedRules);
    }

    const intent = this.detectIntent(message, normalizedMessage);
    switch (intent) {
      case 'branch.lookup':
        return this.buildBranchLookupPlan(message, dto.context?.branchId);
      case 'policy.lookup':
        return this.buildPolicyLookupPlan(message);
      case 'product.price':
        return this.buildProductPricePlan(message, dto.context?.branchId, dto.context?.productId);
      case 'product.stock':
        return this.buildProductStockPlan(message, dto.context?.branchId, dto.context?.productId);
      case 'product.usage':
        return this.buildProductUsagePlan(message, dto.context?.branchId, dto.context?.productId);
      case 'symptom.product_search':
      case 'symptom.stock_lookup':
        return this.buildSymptomPlan(
          message,
          intent,
          dto.context?.branchId,
        );
      case 'health.sensitive':
        return this.buildSensitiveSafetyPlan(['health_sensitive']);
      case 'unknown':
      default:
        return this.buildUnknownPlan();
    }
  }

  private buildEmergencyPlan(): AnswerPlan {
    return {
      intent: 'health.emergency',
      mode: 'HYBRID',
      facts: {
        severity: 'dangerous',
        handoffRequired: true,
        guidance:
          'Trieu chung co dau hieu nguy hiem, can lien he co so y te, cap cuu hoac duoc si ngay.',
      },
      resolvedEntities: {},
      rules: [
        'Khong goi y thuoc',
        'Khong ke don',
        'Chi dien dat lai canh bao an toan',
      ],
      handoffRequired: true,
      warnings: ['Trieu chung co dau hieu nguy hiem, can ho tro chuyen mon ngay.'],
      suggestedActions: ['Gap nhan vien tu van'],
      llmDirective:
        'Chi dien dat lai canh bao an toan, khuyen lien he y te/cap cuu, co the de xuat chuyen nhan vien tu van. Tuyet doi khong goi y thuoc.',
      fallbackAnswer:
        'Trieu chung ban mo ta co dau hieu nguy hiem. Ban nen lien he co so y te/cap cuu hoac duoc si ngay. Toi co the chuyen yeu cau nay cho nhan vien tu van ho tro them.',
    };
  }

  private buildSensitiveSafetyPlan(matchedRules: string[]): AnswerPlan {
    return {
      intent: 'health.sensitive',
      mode: 'HYBRID',
      facts: {
        handoffRequired: true,
        matchedRules,
        guidance:
          'Cau hoi nay can duoc duoc si hoac bac si tu van truc tiep de dam bao an toan.',
      },
      resolvedEntities: {},
      rules: [
        'Khong goi y thuoc',
        'Khong ke don',
        'Chi dien dat lai canh bao an toan',
      ],
      handoffRequired: true,
      warnings: [
        'Cau hoi co yeu to suc khoe nhay cam, chatbot khong tu tu van thay chuyen mon.',
      ],
      suggestedActions: ['Gap nhan vien tu van'],
      llmDirective:
        'Chi dien dat lai canh bao an toan va de xuat gap duoc si/nhan vien tu van. Tuyet doi khong goi y thuoc.',
      fallbackAnswer:
        'Cau hoi nay can duoc duoc si hoac bac si tu van truc tiep de dam bao an toan. Toi co the chuyen yeu cau nay cho nhan vien tu van ho tro them.',
    };
  }

  private async buildBranchLookupPlan(
    message: string,
    branchId?: string,
  ): Promise<AnswerPlan> {
    const branches = (await this.productSearchService.searchBranches(
      message,
      branchId,
    )) as BranchSummary[];

    if (!branches.length) {
      return {
        intent: 'branch.lookup',
        mode: 'HYBRID',
        facts: {
          branches: [],
          hasData: false,
        },
        resolvedEntities: {},
        rules: [
          'Khong bia dia chi neu DB khong co',
          'Neu thieu du lieu thi noi ro he thong chua co thong tin',
        ],
        handoffRequired: true,
        warnings: ['Chua tim thay thong tin chi nhanh phu hop.'],
        suggestedActions: ['Gap nhan vien tu van'],
        llmDirective:
          'Noi ro he thong chua co thong tin chi nhanh phu hop va de xuat gap nhan vien tu van.',
        fallbackAnswer:
          'Hien he thong chua tim thay thong tin chi nhanh phu hop. Ban vui long de lai yeu cau de nhan vien tu van ho tro them.',
      };
    }

    return {
      intent: 'branch.lookup',
      mode: 'HYBRID',
      facts: {
        branches: branches.slice(0, 3).map((branch) => ({
          id: branch.id,
          name: branch.name,
          address: branch.address ?? null,
          phone: branch.phone ?? null,
          code: branch.code ?? null,
        })),
      },
      resolvedEntities: {
        branchId: branches[0]?.id,
      },
      rules: [
        'Khong bia dia chi',
        'Chi dung du lieu chi nhanh tu API',
      ],
      handoffRequired: false,
      warnings: [],
      suggestedActions: [],
      llmDirective:
        'Tra loi ngan gon thong tin chi nhanh, dia chi, so dien thoai theo FACTS. Neu co nhieu chi nhanh, liet ke toi da 3 chi nhanh.',
      fallbackAnswer: this.buildBranchFallbackAnswer(branches),
    };
  }

  private async buildPolicyLookupPlan(message: string): Promise<AnswerPlan> {
    const contexts = await this.searchKnowledgeContexts(
      message,
      ['faq', 'policy', 'general', 'safety'],
      3,
      0.18,
    ).catch((error) => {
      const technicalError = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Policy knowledge search failed: ${technicalError}`);
      return [] as RagContext[];
    });

    if (!contexts.length) {
      return {
        intent: 'policy.lookup',
        mode: 'RAG',
        facts: {
          policyFound: false,
          excerpts: [],
        },
        resolvedEntities: {},
        rules: [
          'Khong tu tao chinh sach moi',
          'Neu khong co du lieu thi noi ro he thong chua co thong tin',
        ],
        handoffRequired: true,
        warnings: ['Khong tim thay chinh sach phu hop trong kho tri thuc.'],
        suggestedActions: ['Gap nhan vien tu van'],
        llmDirective:
          'Noi ro he thong chua co du lieu chinh sach phu hop va de xuat gap nhan vien tu van.',
        fallbackAnswer:
          'Hien he thong chua co du lieu chinh sach phu hop de tra loi chinh xac. Ban vui long gap nhan vien tu van de duoc ho tro them.',
      };
    }

    return {
      intent: 'policy.lookup',
      mode: 'RAG',
      facts: {
        policyFound: true,
        excerpts: contexts.map((context) => ({
          knowledgeId: context.id,
          title: context.title,
          category: context.category,
          content: context.content,
        })),
      },
      resolvedEntities: {
        knowledgeIds: contexts.map((context) => context.id),
      },
      rules: [
        'Chi duoc dien dat lai theo doan chinh sach da truy xuat',
        'Khong tu tao chinh sach moi',
      ],
      handoffRequired: false,
      warnings: [],
      suggestedActions: [],
      llmDirective:
        'Tom tat ngan gon, de hieu theo cac doan chinh sach trong FACTS. Khong them chinh sach moi.',
      fallbackAnswer: this.truncate(contexts[0].content, 320),
    };
  }

  private async buildProductPricePlan(
    message: string,
    branchId?: string,
    productId?: string,
  ): Promise<AnswerPlan> {
    const products = await this.findProducts(message, branchId);
    if (!products.length) {
      return this.buildMissingProductPlan('product.price');
    }

    if (this.shouldAskToChooseProduct(products, productId)) {
      return this.buildProductDisambiguationPlan('product.price', products);
    }

    const product = this.pickBestProduct(products, productId);
    return {
      intent: 'product.price',
      mode: 'HYBRID',
      facts: {
        productName: product.name,
        price: Math.round(product.price),
        unit: 'san pham',
        stockStatus: this.stockStatusLabel(product, branchId),
        availableBranches: this.toAvailabilityFacts(product.availableBranches),
      },
      resolvedEntities: {
        productId: product.id,
        branchId,
      },
      rules: [
        'Khong bia gia',
        'Khong tu them san pham khac',
        'Khong thay doi so lieu',
      ],
      handoffRequired: false,
      warnings: [],
      suggestedActions: [],
      llmDirective:
        'Tra loi gia san pham tu nhien, ngan gon. Co the nhac stockStatus neu FACTS co.',
      fallbackAnswer:
        `${product.name} hien co gia tham khao ${this.formatCurrency(product.price)}.` +
        ` ${this.stockStatusSentence(product, branchId)}`,
    };
  }

  private async buildProductStockPlan(
    message: string,
    branchId?: string,
    productId?: string,
  ): Promise<AnswerPlan> {
    const products = await this.findProducts(message, branchId);
    if (!products.length) {
      return this.buildMissingProductPlan('product.stock');
    }

    if (this.shouldAskToChooseProduct(products, productId)) {
      return this.buildProductDisambiguationPlan('product.stock', products);
    }

    const product = this.pickBestProduct(products, productId);
    const totalAvailable = product.availableBranches.reduce(
      (sum, item) => sum + Number(item.availableQty || 0),
      0,
    );

    return {
      intent: 'product.stock',
      mode: 'HYBRID',
      facts: {
        productName: product.name,
        stockStatus: this.stockStatusLabel(product, branchId),
        totalAvailable,
        availableBranches: this.toAvailabilityFacts(product.availableBranches),
      },
      resolvedEntities: {
        productId: product.id,
        branchId,
      },
      rules: [
        'Khong bia ton kho',
        'Khong tu them san pham khac',
        'Khong thay doi so lieu',
      ],
      handoffRequired: false,
      warnings: [],
      suggestedActions: [],
      llmDirective:
        'Tra loi ngan gon ve ton kho, chi dung FACTS. Neu khong co du lieu ton kho thi noi ro.',
      fallbackAnswer: `${product.name} ${this.stockStatusSentence(product, branchId)}`,
    };
  }

  private async buildProductUsagePlan(
    message: string,
    branchId?: string,
    productId?: string,
  ): Promise<AnswerPlan> {
    const products = await this.findProducts(message, branchId);
    if (!products.length) {
      return this.buildMissingProductPlan('product.usage');
    }

    if (this.shouldAskToChooseProduct(products, productId)) {
      return this.buildProductDisambiguationPlan('product.usage', products);
    }

    const product = this.pickBestProduct(products, productId);
    const usage = product.usage || product.description || '';

    if (!usage && !product.activeIngredient) {
      return {
        intent: 'product.usage',
        mode: 'HYBRID',
        facts: {
          productName: product.name,
          hasData: false,
        },
        resolvedEntities: {
          productId: product.id,
          branchId,
        },
        rules: [
          'Khong bia cong dung',
          'Neu thieu du lieu thi noi ro he thong chua co thong tin',
        ],
        handoffRequired: true,
        warnings: ['Khong co du lieu cong dung phu hop trong he thong.'],
        suggestedActions: ['Gap nhan vien tu van'],
        llmDirective:
          'Noi ro he thong chua co thong tin cong dung day du va de xuat gap nhan vien tu van.',
        fallbackAnswer:
          `Hien he thong chua co thong tin day du ve cong dung cua ${product.name}. Ban vui long gap nhan vien tu van de duoc ho tro them.`,
      };
    }

    return {
      intent: 'product.usage',
      mode: 'HYBRID',
      facts: {
        productName: product.name,
        usage: usage || null,
        activeIngredient: product.activeIngredient || null,
      },
      resolvedEntities: {
        productId: product.id,
        branchId,
      },
      rules: [
        'Khong bia cong dung',
        'Chi dien dat lai thong tin usage trong FACTS',
      ],
      handoffRequired: false,
      warnings: [],
      suggestedActions: [],
      llmDirective:
        'Tra loi ngan gon ve cong dung/thong tin lien quan, chi dua tren FACTS.',
      fallbackAnswer: [
        product.name,
        usage ? this.toSentence(usage) : '',
        product.activeIngredient ? `Hoat chat: ${product.activeIngredient}.` : '',
      ]
        .filter(Boolean)
        .join(' '),
    };
  }

  private async buildSymptomPlan(
    message: string,
    intent: 'symptom.product_search' | 'symptom.stock_lookup',
    branchId?: string,
  ): Promise<AnswerPlan> {
    const symptomQuery = this.extractSymptomQuery(message);
    const products = await this.findProductsBySymptom(message, symptomQuery, branchId);
    const filtered = products.filter((product) => Number(product.matchScore ?? 0) >= 3);

    if (!filtered.length) {
      return {
        intent,
        mode: 'HYBRID',
        facts: {
          symptomQuery,
          products: [],
          hasData: false,
        },
        resolvedEntities: {},
        rules: [
          'Khong tu goi y thuoc neu khong chac',
          'Neu khong du lieu thi de xuat gap nhan vien tu van',
        ],
        handoffRequired: true,
        warnings: ['Chua tim thay san pham lien quan trong du lieu he thong.'],
        suggestedActions: ['Gap nhan vien tu van'],
        llmDirective:
          'Noi ro he thong chua co du lieu du chac chan de goi y san pham va de xuat gap nhan vien tu van.',
        fallbackAnswer:
          'Toi chua tim thay san pham phu hop trong he thong. Ban co the mo ta ro hon trieu chung hoac chon gap nhan vien tu van de duoc ho tro.',
      };
    }

    const topProducts = filtered.slice(0, 3);
    return {
      intent,
      mode: 'HYBRID',
      facts: {
        symptomQuery,
        products: topProducts.map((product) => ({
          productId: product.id,
          productName: product.name,
          stockStatus: this.stockStatusLabel(product, branchId),
          availableBranches: this.toAvailabilityFacts(product.availableBranches),
          usage: product.usage || null,
          activeIngredient: product.activeIngredient || null,
        })),
      },
      resolvedEntities: {
        productId: topProducts[0]?.id,
        branchId,
      },
      rules: [
        'Khong goi y thuoc ngoai FACTS',
        'Khong dua san pham sai ngu canh',
        'Neu khong chac thi de xuat gap nhan vien tu van',
      ],
      handoffRequired: false,
      warnings: [],
      suggestedActions: [],
      llmDirective:
        intent === 'symptom.stock_lookup'
          ? 'Tra loi danh sach toi da 3 san pham lien quan va tinh trang con hang theo FACTS.'
          : 'Tra loi danh sach toi da 3 san pham lien quan theo FACTS, nhac day chi la thong tin tham khao.',
      fallbackAnswer:
        intent === 'symptom.stock_lookup'
          ? this.buildSymptomStockAnswer(topProducts, branchId)
          : this.buildSymptomProductAnswer(topProducts),
    };
  }

  private buildUnknownPlan(): AnswerPlan {
    return {
      intent: 'unknown',
      mode: 'RAG',
      facts: {
        hasData: false,
      },
      resolvedEntities: {},
      rules: [
        'Neu khong co du lieu thi noi ro he thong chua co thong tin',
      ],
      handoffRequired: true,
      warnings: ['Chua xac dinh duoc nhu cau truy xuat du lieu.'],
      suggestedActions: ['Gap nhan vien tu van'],
      llmDirective:
        'Noi ro he thong chua hieu du yeu cau va de xuat khach noi ro hon hoac gap nhan vien tu van.',
      fallbackAnswer:
        'Toi chua du thong tin de tra loi chinh xac. Ban vui long noi ro hon yeu cau hoac chon gap nhan vien tu van.',
    };
  }

  private buildMissingProductPlan(intent: 'product.price' | 'product.stock' | 'product.usage'): AnswerPlan {
    return {
      intent,
      mode: 'HYBRID',
      facts: {
        hasData: false,
        products: [],
      },
      resolvedEntities: {},
      rules: [
        'Khong bia du lieu san pham',
        'Neu khong tim thay thi noi ro he thong chua co thong tin',
      ],
      handoffRequired: true,
      warnings: ['Khong tim thay san pham phu hop trong danh muc cong khai.'],
      suggestedActions: ['Gap nhan vien tu van'],
      llmDirective:
        'Noi ro he thong chua tim thay san pham phu hop va de xuat gap nhan vien tu van.',
      fallbackAnswer:
        'Hien he thong chua tim thay san pham phu hop. Ban vui long kiem tra lai ten san pham hoac chon gap nhan vien tu van.',
    };
  }

  private buildProductDisambiguationPlan(
    intent: 'product.price' | 'product.stock' | 'product.usage',
    products: ChatProductSummary[],
  ): AnswerPlan {
    const topProducts = products.slice(0, 3);
    return {
      intent,
      mode: 'HYBRID',
      facts: {
        options: topProducts.map((product) => ({
          productId: product.id,
          productName: product.name,
          price: Math.round(product.price),
          stockStatus: this.stockStatusLabel(product),
        })),
      },
      resolvedEntities: {
        productId: undefined,
      },
      rules: [
        'Khong tu chon san pham khi nhieu ket qua gan nhau',
        'Chi tra toi da 3 san pham',
      ],
      handoffRequired: false,
      warnings: [],
      suggestedActions: [],
      llmDirective:
        'Noi ngan gon rang co nhieu san pham gan giong nhau, liet ke toi da 3 lua chon va moi khach chon lai.',
      fallbackAnswer: [
        'Toi tim thay mot vai san pham gan giong nhau. Ban vui long chon dung san pham can hoi:',
        ...topProducts.map(
          (product, index) =>
            `${index + 1}. ${product.name} - ${this.formatCurrency(product.price)} - ${this.stockStatusLabel(product)}`,
        ),
      ].join('\n'),
    };
  }

  private async generateNaturalAnswer(
    plan: AnswerPlan,
    message: string,
  ): Promise<string> {
    const answerContext: PublicChatAnswerContextDto = {
      intent: plan.intent,
      facts: plan.facts,
      rules: plan.rules,
    };

    const userPrompt = [
      `QUESTION: ${message}`,
      `DIRECTIVE: ${plan.llmDirective}`,
      `FACTS: ${JSON.stringify(answerContext.facts)}`,
      `RULES: ${JSON.stringify(answerContext.rules)}`,
    ].join('\n');

    try {
      const answer = await this.llmService.generateAnswer(
        this.naturalAnswerPrompt,
        userPrompt,
        { temperature: 0.3, topP: 0.9 },
      );
      return this.sanitizeGeneratedAnswer(answer, plan);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Public answer generation fallback triggered: ${messageText}`);
      return plan.fallbackAnswer;
    }
  }

  private sanitizeGeneratedAnswer(answer: string, plan: AnswerPlan): string {
    const sanitized = answer
      .replace(/sourcepath|knowledge-base|chunks?\.json/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!sanitized) {
      return plan.fallbackAnswer;
    }

    if (this.containsTechnicalLeak(sanitized)) {
      return plan.fallbackAnswer;
    }

    return sanitized;
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
      return catalogMatches.slice(0, 5);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Symptom product lookup failed: ${messageText}`);
      return [];
    }
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

  private shouldAskToChooseProduct(
    products: ChatProductSummary[],
    preferredProductId?: string,
  ): boolean {
    if (preferredProductId || products.length < 2) {
      return false;
    }

    const topScore = Number(products[0]?.matchScore ?? 0);
    const secondScore = Number(products[1]?.matchScore ?? 0);
    if (topScore >= 90 && secondScore <= topScore - 20) {
      return false;
    }

    return secondScore > 0 && topScore - secondScore < 18;
  }

  private detectIntent(message: string, normalizedMessage: string): PublicIntent {
    const symptomQuery = this.extractSymptomQuery(message);
    const symptomRelated = this.isSymptomRelated(normalizedMessage, symptomQuery);

    if (
      this.containsAny(normalizedMessage, [
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

    if (
      this.containsAny(normalizedMessage, [
        'dia chi',
        'o dau',
        'chi nhanh',
        'hotline',
        'so dien thoai',
        'lien he',
      ])
    ) {
      return 'branch.lookup';
    }

    if (
      this.containsAny(normalizedMessage, [
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
      ])
    ) {
      return 'policy.lookup';
    }

    if (
      this.containsAny(normalizedMessage, [
        'bao nhieu tien',
        'gia bao nhieu',
        'gia cua',
        'bao tien',
        'gia thuoc',
        'gia',
      ])
    ) {
      return 'product.price';
    }

    if (!symptomRelated && this.containsAny(normalizedMessage, this.stockKeywords)) {
      return 'product.stock';
    }

    if (
      this.containsAny(normalizedMessage, [
        'cong dung',
        'dung de lam gi',
        'thuoc nay dung de lam gi',
        'cach dung',
        'luu y',
        'chi dinh',
        'hoat chat',
      ])
    ) {
      return 'product.usage';
    }

    if (symptomRelated && this.containsAny(normalizedMessage, this.stockKeywords)) {
      return 'symptom.stock_lookup';
    }

    if (symptomRelated) {
      return 'symptom.product_search';
    }

    return 'unknown';
  }

  private isSymptomRelated(normalizedMessage: string, symptomQuery: string): boolean {
    const phraseKeywords = this.symptomKeywords.filter((keyword) => keyword.includes(' '));
    if (this.containsAny(normalizedMessage, phraseKeywords)) {
      return true;
    }

    const normalizedSymptom = this.normalizeVi(symptomQuery);
    if (!normalizedSymptom) {
      return false;
    }

    const tokens = new Set(
      normalizedSymptom.split(' ').filter((token) => token.length > 1),
    );
    return ['dau', 'ho', 'sot', 'non', 'tieu', 'cam', 'cum', 'bung', 'day'].some(
      (token) => tokens.has(token),
    );
  }

  private extractSymptomQuery(message: string): string {
    return this.normalizeVi(message)
      .replace(
        /\b(thuoc|san pham|co|khong|con|hang|ban|nen|dung|gi|nao|cho toi|toi|muon|hoi|kiem tra|xem|giup|voi)\b/g,
        ' ',
      )
      .replace(/\b(co ban|con hang|con khong|co thuoc)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private detectDangerousMedicalQuestion(normalizedMessage: string): boolean {
    return this.containsAny(normalizedMessage, this.dangerousMedicalPatterns);
  }

  private stockStatusLabel(product: ChatProductSummary, branchId?: string): string {
    if (!product.availableBranches.length) {
      return 'Chua co du lieu ton kho';
    }
    if (branchId) {
      const total = product.availableBranches.reduce(
        (sum, item) => sum + Number(item.availableQty || 0),
        0,
      );
      return total > 0 ? 'Con hang' : 'Het hang';
    }
    return product.availableBranches.some((item) => Number(item.availableQty || 0) > 0)
      ? 'Con hang'
      : 'Het hang';
  }

  private stockStatusSentence(product: ChatProductSummary, branchId?: string): string {
    if (!product.availableBranches.length) {
      return 'Hien he thong chua co du lieu ton kho.';
    }

    if (branchId) {
      const total = product.availableBranches.reduce(
        (sum, item) => sum + Number(item.availableQty || 0),
        0,
      );
      return total > 0
        ? `San pham dang con hang tai chi nhanh da chon voi so luong kha dung khoang ${this.formatQuantity(total)}.`
        : 'Hien chua ghi nhan con hang tai chi nhanh da chon.';
    }

    const branches = product.availableBranches
      .slice(0, 2)
      .map((item) => item.name)
      .join(', ');
    return branches ? `San pham dang con hang tai ${branches}.` : 'Hien chua ghi nhan con hang.';
  }

  private toAvailabilityFacts(
    availableBranches: ChatProductAvailabilityBranch[],
  ): Array<{ branchId: string; branchName: string; availableQty: number }> {
    return availableBranches.map((branch) => ({
      branchId: branch.id,
      branchName: branch.name,
      availableQty: Number(branch.availableQty || 0),
    }));
  }

  private buildBranchFallbackAnswer(branches: BranchSummary[]): string {
    return [
      'Thong tin chi nhanh nha thuoc:',
      ...branches.slice(0, 3).map((branch, index) => {
        const details = [branch.address, branch.phone ? `SDT: ${branch.phone}` : '']
          .filter(Boolean)
          .join(' - ');
        return `${index + 1}. ${branch.name}${details ? `: ${details}` : ''}`;
      }),
    ].join('\n');
  }

  private buildSymptomProductAnswer(products: ChatProductSummary[]): string {
    const lines = products.slice(0, 3).map((product, index) => {
      const details = [
        product.category ? `nhom ${product.category}` : '',
        product.usage ? `thong tin lien quan: ${this.truncate(product.usage, 90)}` : '',
        product.activeIngredient
          ? `hoat chat: ${this.truncate(product.activeIngredient, 50)}`
          : '',
      ].filter(Boolean);

      return `${index + 1}. ${product.name}${details.length ? ` (${details.join('; ')})` : ''}`;
    });

    return [
      'Toi co tim thay mot so san pham lien quan trong he thong de ban tham khao:',
      ...lines,
      'Day chi la thong tin tham khao, ban nen trao doi them voi duoc si de chon san pham phu hop.',
    ].join('\n');
  }

  private buildSymptomStockAnswer(
    products: ChatProductSummary[],
    branchId?: string,
  ): string {
    const lines = products.slice(0, 3).map((product, index) => {
      return `${index + 1}. ${product.name}: ${this.stockStatusSentence(product, branchId)}`;
    });

    return [
      'Toi co tim thay mot so san pham lien quan trong he thong:',
      ...lines,
      'Danh sach nay chi mang tinh tham khao theo du lieu san pham va ton kho hien co.',
    ].join('\n');
  }

  private containsAny(text: string, patterns: string[]): boolean {
    return patterns.some((pattern) => text.includes(this.normalizeVi(pattern)));
  }

  private normalizeVi(value: string): string {
    return value
      .replace(/[đĐ]/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
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
    return `${new Intl.NumberFormat('vi-VN').format(Math.round(value))}d`;
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

  private toSentence(value: string): string {
    const text = value.replace(/\s+/g, ' ').trim();
    if (!text) {
      return '';
    }
    return text.endsWith('.') ? text : `${text}.`;
  }

  private containsTechnicalLeak(answer: string): boolean {
    return /sourcepath|knowledge-base|chunks?\.json|\.md\b/i.test(answer);
  }

  private async finalizeResponse(
    conversationId: string,
    response: PublicChatResponseDto,
  ): Promise<PublicChatResponseDto> {
    const sanitizedWarnings = this.sanitizeWarnings(response.warnings);
    const sanitizedResponse: PublicChatResponseDto = {
      ...response,
      warnings: sanitizedWarnings,
      metadata: {
        ...response.metadata,
        answerContext: {
          ...response.metadata.answerContext,
          facts: response.metadata.facts,
        },
      },
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
        metadata: sanitizedResponse.metadata,
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
        ? 'Kho tri thuc hien chua san sang de tra loi tu dong.'
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
