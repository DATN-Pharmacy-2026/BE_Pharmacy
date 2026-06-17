import { Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { VectorStoreService } from './vector-store.service';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { KnowledgeIndexService } from './knowledge-index.service';

@Module({
  providers: [EmbeddingService, VectorStoreService, RagService, KnowledgeIndexService],
  exports: [EmbeddingService, VectorStoreService, RagService, KnowledgeIndexService],
  controllers: [RagController],
})
export class RagModule {}
