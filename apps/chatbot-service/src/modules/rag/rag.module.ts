import { Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { VectorStoreService } from './vector-store.service';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';

@Module({
  providers: [EmbeddingService, VectorStoreService, RagService],
  exports: [EmbeddingService, VectorStoreService, RagService],
  controllers: [RagController],
})
export class RagModule {}
