import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChatbotService } from './chatbot.service';
import { AskChatbotDto } from './dto/ask-chatbot.dto';
import { HandoffChatbotDto } from './dto/handoff-chatbot.dto';
import { IngestChatbotDto } from './dto/ingest-chatbot.dto';

@ApiTags('chatbot')
@Controller('api/chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Get('health')
  health() {
    return { service: 'chatbot-rag', status: 'ready' };
  }

  @Post('ask')
  ask(@Body() dto: AskChatbotDto) {
    return this.chatbotService.ask(dto);
  }

  @Post('ingest')
  ingest(@Body() dto: IngestChatbotDto) {
    return this.chatbotService.ingest(dto.documents);
  }

  @Post('handoff')
  handoff(@Body() dto: HandoffChatbotDto) {
    return this.chatbotService.handoff(dto);
  }
}

