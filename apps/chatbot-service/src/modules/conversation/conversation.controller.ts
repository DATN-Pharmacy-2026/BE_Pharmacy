import { Controller, Get, Param } from '@nestjs/common';
import { ConversationService } from './conversation.service';

@Controller('chat/conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get(':userId')
  async getByUser(@Param('userId') userId: string) {
    return this.conversationService.getConversationsByUser(userId);
  }

  @Get('detail/:conversationId')
  async getDetail(@Param('conversationId') conversationId: string) {
    return this.conversationService.getConversationDetail(conversationId);
  }
}
