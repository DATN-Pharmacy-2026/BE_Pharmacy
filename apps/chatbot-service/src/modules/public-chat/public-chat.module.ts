import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConversationModule } from '../conversation/conversation.module';
import { SafetyModule } from '../safety/safety.module';
import { RagModule } from '../rag/rag.module';
import { PublicChatController } from './public-chat.controller';
import { PublicChatService } from './public-chat.service';
import { LlmService } from '../chat/llm.service';
import { ProductSearchService } from '../chat/product-search.service';

@Module({
  imports: [HttpModule, ConversationModule, SafetyModule, RagModule],
  controllers: [PublicChatController],
  providers: [PublicChatService, LlmService, ProductSearchService],
})
export class PublicChatModule {}
