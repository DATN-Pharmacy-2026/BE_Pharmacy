import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicChatRequestDto } from './dto/public-chat.dto';
import { PublicChatService } from './public-chat.service';

@ApiTags('chatbot-public')
@Controller('api/chatbot')
export class PublicChatController {
  constructor(private readonly publicChatService: PublicChatService) {}

  @Post('chat')
  async chat(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: PublicChatRequestDto,
  ) {
    return this.publicChatService.chat(dto);
  }
}
