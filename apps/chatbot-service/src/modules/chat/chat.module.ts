import { Module } from '@nestjs/common';
import { RagModule } from '../rag/rag.module';
import { SafetyModule } from '../safety/safety.module';
import { ConversationModule } from '../conversation/conversation.module';
import { HandoffModule } from '../handoff/handoff.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { LlmService } from './llm.service';

@Module({
  imports: [RagModule, SafetyModule, ConversationModule, HandoffModule],
  controllers: [ChatController],
  providers: [ChatService, LlmService],
  exports: [ChatService],
})
export class ChatModule {}
