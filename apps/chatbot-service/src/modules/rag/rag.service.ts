import { Injectable } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { VectorStoreService } from './vector-store.service';

@Injectable()
export class RagService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  async search(query: string, topK = 5) {
    const queryEmbedding = await this.embeddingService.createEmbedding(
      query,
      'RETRIEVAL_QUERY',
    );
    const results = await this.vectorStoreService.searchSimilar(
      queryEmbedding,
      topK,
    );
    return {
      query,
      results: results.map((item) => ({
        score: item.score,
        title: item.title,
        category: item.category,
        source: item.source,
        content: item.content,
      })),
    };
  }
}
