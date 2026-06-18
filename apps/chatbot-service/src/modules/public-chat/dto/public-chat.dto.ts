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

export interface PublicChatResolvedEntitiesDto {
  productId?: string;
  orderId?: string;
  categoryId?: string;
  branchId?: string;
  knowledgeIds?: string[];
}

export interface PublicChatAnswerContextDto {
  intent: string;
  facts: Record<string, unknown>;
  rules: string[];
}

export interface PublicChatMetadataDto {
  answerContext: PublicChatAnswerContextDto;
  facts: Record<string, unknown>;
  resolvedEntities: PublicChatResolvedEntitiesDto;
}

export interface PublicChatResponseDto {
  answer: string;
  mode: PublicChatMode;
  intent: string;
  conversationId: string;
  handoffRequired: boolean;
  warnings: string[];
  suggestedActions: string[];
  metadata: PublicChatMetadataDto;
}
