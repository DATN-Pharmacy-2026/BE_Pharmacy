import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { ChatRequestDto } from './dto/chat.dto';
import { ChatService } from './chat.service';

@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('chat')
  async chat(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: ChatRequestDto,
  ) {
    return this.chatService.chat(
      dto.userId.trim(),
      dto.message.trim(),
      dto.conversationId?.trim(),
      5,
    );
  }
}
