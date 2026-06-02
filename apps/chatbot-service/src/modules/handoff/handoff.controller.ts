import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { HandoffListQueryDto, UpdateHandoffTicketDto } from './dto/handoff.dto';
import { HandoffService } from './handoff.service';

@Controller(['handoff', 'api/handoff'])
export class HandoffController {
  constructor(private readonly handoffService: HandoffService) {}

  @Get('tickets')
  async getTickets(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: HandoffListQueryDto,
  ) {
    const items = await this.handoffService.getTickets(query.status);
    return { items };
  }

  @Get('tickets/:id')
  async getTicketById(@Param('id') id: string) {
    const ticket = await this.handoffService.getTicketById(id.trim());
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  @Patch('tickets/:id')
  async updateTicket(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateHandoffTicketDto,
  ) {
    const ticket = await this.handoffService.updateTicket(
      id.trim(),
      dto.status,
      dto.responseNote?.trim(),
    );
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }
}
