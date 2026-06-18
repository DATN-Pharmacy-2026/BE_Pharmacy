import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { CreatePublicHandoffDto } from './dto/handoff.dto';
import { HandoffService } from './handoff.service';

@Controller()
export class PublicHandoffController {
  constructor(private readonly handoffService: HandoffService) {}

  @Post([
    'handoff/public',
    'api/handoff/public',
    'chatbot/handoff',
    'api/chatbot/handoff',
  ])
  async createPublicHandoff(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreatePublicHandoffDto,
  ) {
    const ticket = await this.handoffService.createTicket({
      source: dto.source ?? 'PUBLIC_CHATBOT',
      conversationId: dto.conversationId?.trim(),
      userId: dto.userId?.trim(),
      question: dto.message.trim(),
      handoffReason: dto.reason,
      customerName: dto.customerName?.trim(),
      customerPhone: dto.customerPhone?.trim(),
      customerEmail: dto.customerEmail?.trim(),
      branchId: dto.branchId?.trim(),
      latestChatbotReply: dto.latestChatbotReply?.trim(),
      conversationSnapshot: dto.conversation?.map((item) => ({
        role: item.role.trim(),
        content: item.content.trim(),
      })),
    });

    return {
      ticketId: ticket.id,
      ticketCode: ticket.ticketCode,
      status: ticket.status,
      message: 'Yeu cau tu van da duoc gui toi nhan vien.',
    };
  }
}
