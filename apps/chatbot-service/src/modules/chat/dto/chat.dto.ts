import { IsString } from 'class-validator';

export class ChatRequestDto {
  @IsString()
  userId!: string;

  @IsString()
  message!: string;

  conversationId?: string;
}

export interface ChatSource {
  title: string;
  source: string;
}

export interface ChatResponseDto {
  answer: string;
  sources: ChatSource[];
  handoffRequired: boolean;
  handoffReason?: 'MEDICAL_SAFETY' | 'INSUFFICIENT_CONTEXT';
  handoffTicketId?: string;
  handoffTicketCode?: string;
  conversationId?: string;
}
