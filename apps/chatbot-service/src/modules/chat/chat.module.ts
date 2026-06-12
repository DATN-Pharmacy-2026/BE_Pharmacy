import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RagModule } from '../rag/rag.module';
import { SafetyModule } from '../safety/safety.module';
import { ConversationModule } from '../conversation/conversation.module';
import { HandoffModule } from '../handoff/handoff.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { LlmService } from './llm.service';
import { ProductSearchService } from './product-search.service';

@Module({
  imports: [HttpModule, RagModule, SafetyModule, ConversationModule, HandoffModule],
  controllers: [ChatController],
  providers: [ChatService, LlmService, ProductSearchService],
  exports: [ChatService],
})
export class ChatModule {}
