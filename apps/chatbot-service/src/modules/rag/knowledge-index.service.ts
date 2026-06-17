import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { VectorStoreService } from './vector-store.service';
import type { VectorPayload } from './vector-store.types';

type ProductListResponse = {
  items?: ProductDocumentSource[];
  meta?: {
    page?: number;
    limit?: number;
    totalPages?: number;
  };
};

type ProductDocumentSource = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit?: string | null;
  description?: string | null;
  activeIngredient?: string | null;
  indication?: string | null;
  basePrice?: number | null;
  minStockLevel?: number | null;
  category?: { id?: string; name?: string | null };
  brand?: { id?: string; name?: string | null };
  dosageForm?: string | null;
  strength?: string | null;
  registrationNumber?: string | null;
  usage?: string | null;
  directions?: string | null;
  warnings?: string | null;
  precautions?: string | null;
};

type KnowledgeChunkSource = {
  id: string;
  type?: string;
  title?: string;
  category?: string;
  section?: string;
  tags?: string[];
  source?: string;
  sourcePath?: string;
  content: string;
};

type ReindexResult = {
  indexed: number;
  failed: number;
  collection: string;
  source: 'products' | 'faq' | 'knowledge';
  qdrantHealthy: boolean;
};

@Injectable()
export class KnowledgeIndexService {
  private readonly logger = new Logger(KnowledgeIndexService.name);
  private readonly commerceServiceUrl = (
    process.env.COMMERCE_SERVICE_URL || 'http://commerce-service:3002'
  ).replace(/\/+$/, '');
  private readonly knowledgeBaseCandidates = [
    path.resolve(process.cwd(), 'apps/chatbot-service/knowledge-base/chunks.json'),
    path.resolve(__dirname, '../../../knowledge-base/chunks.json'),
  ];

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  async reindexProducts(): Promise<ReindexResult> {
    const qdrantHealthy = await this.vectorStoreService.health();
    if (!qdrantHealthy) {
      throw new ServiceUnavailableException(
        'Qdrant is not reachable. Please start Qdrant before reindexing products.',
      );
    }
    this.assertEmbeddingReady();
    const products = await this.fetchActiveProducts();
    if (products.length === 0) {
      return {
        indexed: 0,
        failed: 0,
        collection: this.vectorStoreService.getCollectionName(),
        source: 'products',
        qdrantHealthy,
      };
    }

    const rows = await this.buildProductRows(products);
    if (!rows.length) {
      return {
        indexed: 0,
        failed: 0,
        collection: this.vectorStoreService.getCollectionName(),
        source: 'products',
        qdrantHealthy,
      };
    }

    await this.vectorStoreService.ensureCollection(rows[0].embedding.length);
    await this.vectorStoreService.deleteByTypes(['product']);
    await this.vectorStoreService.upsertChunks(rows);

    return {
      indexed: rows.length,
      failed: 0,
      collection: this.vectorStoreService.getCollectionName(),
      source: 'products',
      qdrantHealthy,
    };
  }

  async reindexFaq(): Promise<ReindexResult> {
    const qdrantHealthy = await this.vectorStoreService.health();
    if (!qdrantHealthy) {
      throw new ServiceUnavailableException(
        'Qdrant is not reachable. Please start Qdrant before reindexing FAQ.',
      );
    }
    this.assertEmbeddingReady();
    const chunks = this.loadKnowledgeChunks().filter((chunk) =>
      ['faq', 'policies', 'safety'].includes(chunk.category || 'general'),
    );

    if (!chunks.length) {
      return {
        indexed: 0,
        failed: 0,
        collection: this.vectorStoreService.getCollectionName(),
        source: 'faq',
        qdrantHealthy,
      };
    }

    const rows = await this.buildKnowledgeRows(chunks);
    if (!rows.length) {
      return {
        indexed: 0,
        failed: chunks.length,
        collection: this.vectorStoreService.getCollectionName(),
        source: 'faq',
        qdrantHealthy,
      };
    }

    await this.vectorStoreService.ensureCollection(rows[0].embedding.length);
    await this.vectorStoreService.deleteByTypes([
      'faq',
      'policy',
      'general',
      'safety',
    ]);
    await this.vectorStoreService.upsertChunks(rows);

    return {
      indexed: rows.length,
      failed: chunks.length - rows.length,
      collection: this.vectorStoreService.getCollectionName(),
      source: 'faq',
      qdrantHealthy,
    };
  }

  async reindexKnowledge(): Promise<ReindexResult> {
    const qdrantHealthy = await this.vectorStoreService.health();
    if (!qdrantHealthy) {
      throw new ServiceUnavailableException(
        'Qdrant is not reachable. Please start Qdrant before reindexing knowledge.',
      );
    }
    this.assertEmbeddingReady();

    const chunks = this.loadKnowledgeChunks();
    if (!chunks.length) {
      return {
        indexed: 0,
        failed: 0,
        collection: this.vectorStoreService.getCollectionName(),
        source: 'knowledge',
        qdrantHealthy,
      };
    }

    const rows = await this.buildKnowledgeRows(chunks);
    if (!rows.length) {
      return {
        indexed: 0,
        failed: chunks.length,
        collection: this.vectorStoreService.getCollectionName(),
        source: 'knowledge',
        qdrantHealthy,
      };
    }

    await this.vectorStoreService.ensureCollection(rows[0].embedding.length);

    let indexed = 0;
    let failed = chunks.length - rows.length;

    for (const row of rows) {
      try {
        await this.vectorStoreService.upsertChunks([row]);
        indexed += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to upsert knowledge chunk ${String(row.payload.id)}: ${message}`,
        );
      }
    }

    this.logger.log(
      `Knowledge reindex completed. indexed=${indexed}, failed=${failed}, collection=${this.vectorStoreService.getCollectionName()}`,
    );

    return {
      indexed,
      failed,
      collection: this.vectorStoreService.getCollectionName(),
      source: 'knowledge',
      qdrantHealthy,
    };
  }

  private async fetchActiveProducts(): Promise<ProductDocumentSource[]> {
    const items: ProductDocumentSource[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const url = new URL('/api/products', `${this.commerceServiceUrl}/`);
      url.searchParams.set('page', String(page));
      url.searchParams.set('limit', '100');
      url.searchParams.set('status', 'ACTIVE');

      const response = await fetch(url.toString());
      if (!response.ok) {
        const err = await response.text();
        throw new Error(
          `Failed to fetch products for indexing (${response.status}): ${err}`,
        );
      }

      const payload = (await response.json()) as ProductListResponse;
      items.push(...(payload.items ?? []));
      totalPages = Number(payload.meta?.totalPages ?? 1);
      page += 1;
    } while (page <= totalPages);

    this.logger.log(`Loaded ${items.length} active products for indexing.`);
    return items;
  }

  private async buildProductRows(products: ProductDocumentSource[]) {
    const rows: Array<{
      id: string;
      embedding: number[];
      payload: VectorPayload;
    }> = [];

    for (const product of products) {
      const content = this.buildProductDocumentText(product);
      if (!content) continue;

      const embedding = await this.embeddingService.createEmbedding(
        content,
        'RETRIEVAL_DOCUMENT',
      );

      rows.push({
        id: this.normalizePointId(`product_${product.id}`),
        embedding,
        payload: {
          id: `product:${product.id}`,
          type: 'product',
          productId: product.id,
          title: product.name,
          name: product.name,
          sku: product.sku ?? undefined,
          brand: product.brand?.name ?? undefined,
          category: product.category?.name ?? 'product',
          source: 'commerce-service',
          chunkIndex: 1,
          content,
        },
      });
    }

    return rows;
  }

  private buildProductDocumentText(product: ProductDocumentSource): string {
    const lines = [
      `Tên sản phẩm: ${product.name}`,
      product.sku ? `SKU: ${product.sku}` : '',
      product.barcode ? `Barcode: ${product.barcode}` : '',
      product.category?.name ? `Danh mục: ${product.category.name}` : '',
      product.brand?.name ? `Thương hiệu: ${product.brand.name}` : '',
      product.description ? `Mô tả: ${product.description}` : '',
      product.activeIngredient ? `Hoạt chất: ${product.activeIngredient}` : '',
      product.indication ? `Công dụng hoặc chỉ định: ${product.indication}` : '',
      this.pickOptional(product, ['usage', 'directions'])
        ? `Cách dùng: ${this.pickOptional(product, ['usage', 'directions'])}`
        : '',
      this.pickOptional(product, ['warnings', 'precautions'])
        ? `Lưu ý: ${this.pickOptional(product, ['warnings', 'precautions'])}`
        : '',
      product.unit ? `Đơn vị: ${product.unit}` : '',
      product.dosageForm ? `Dạng bào chế: ${product.dosageForm}` : '',
      product.strength ? `Hàm lượng: ${product.strength}` : '',
      product.registrationNumber
        ? `Số đăng ký: ${product.registrationNumber}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    return lines.trim();
  }

  private loadKnowledgeChunks(): KnowledgeChunkSource[] {
    const knowledgeBaseFile = this.knowledgeBaseCandidates.find((candidate) =>
      fs.existsSync(candidate),
    );
    if (!knowledgeBaseFile) {
      throw new Error(
        `Knowledge base file not found. Checked: ${this.knowledgeBaseCandidates.join(', ')}`,
      );
    }

    const raw = fs.readFileSync(knowledgeBaseFile, 'utf-8');
    return JSON.parse(raw) as KnowledgeChunkSource[];
  }

  private async buildKnowledgeRows(chunks: KnowledgeChunkSource[]) {
    const rows: Array<{
      id: string;
      embedding: number[];
      payload: VectorPayload;
    }> = [];

    for (const chunk of chunks) {
      const category = chunk.category || 'general';
      const content = chunk.content?.trim();
      if (!content) continue;

      const embedding = await this.embeddingService.createEmbedding(
        content,
        'RETRIEVAL_DOCUMENT',
      );

      rows.push({
        id: this.normalizePointId(`knowledge_${chunk.id}`),
        embedding,
        payload: {
          id: chunk.id,
          type: this.mapKnowledgeCategoryToSearchType(category),
          title: chunk.title || chunk.id,
          category,
          section: chunk.section || 'Tổng quan',
          tags: Array.isArray(chunk.tags) ? chunk.tags : [],
          source: chunk.source || 'knowledge-base',
          sourcePath: chunk.sourcePath || '',
          recordType: chunk.type || 'knowledge',
          chunkIndex: 1,
          content,
        },
      });
    }

    return rows;
  }

  private pickOptional(
    product: ProductDocumentSource,
    keys: Array<keyof ProductDocumentSource>,
  ): string {
    for (const key of keys) {
      const value = product[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
    return '';
  }

  private normalizePointId(input: string): string {
    const hex = createHash('sha256').update(input).digest('hex');
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32),
    ].join('-');
  }

  private mapKnowledgeCategoryToSearchType(category: string): string {
    switch (category) {
      case 'faq':
        return 'faq';
      case 'policies':
        return 'policy';
      case 'safety':
        return 'safety';
      case 'medicines':
      case 'symptoms':
      default:
        return 'general';
    }
  }

  private assertEmbeddingReady(): void {
    if (!this.embeddingService.hasApiKey()) {
      throw new BadRequestException(
        `${this.embeddingService.getProviderName().toUpperCase()} API key is missing. Cannot generate embeddings for reindex.`,
      );
    }
  }
}
