import {
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PublicChatContextDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class PublicChatRequestDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PublicChatContextDto)
  context?: PublicChatContextDto;
}

export type PublicChatMode = 'RAG' | 'HYBRID';

export interface PublicChatResponseDto {
  answer: string;
  mode: PublicChatMode;
  intent: string;
  conversationId: string;
  handoffRequired: boolean;
  warnings: string[];
  suggestedActions: string[];
}
