import { IsOptional, IsString } from 'class-validator';

export class ChatRequestDto {
  @IsString()
  userId!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export interface ChatSource {
  title: string;
  source: string;
}

export interface ChatProductAvailabilityBranch {
  id: string;
  name: string;
  code?: string;
  availableQty: number;
}

export interface ChatProductSummary {
  id: string;
  name: string;
  slug?: string;
  price: number;
  category?: string;
  activeIngredient?: string;
  description?: string;
  usage?: string;
  imageUrl?: string;
  requiresPrescription: boolean;
  isAvailable: boolean;
  availableBranches: ChatProductAvailabilityBranch[];
}

export interface ChatResponseDto {
  answer: string;
  sources: ChatSource[];
  products?: ChatProductSummary[];
  handoffRequired: boolean;
  handoffReason?: 'MEDICAL_SAFETY' | 'INSUFFICIENT_CONTEXT';
  handoffTicketId?: string;
  handoffTicketCode?: string;
  conversationId?: string;
}
