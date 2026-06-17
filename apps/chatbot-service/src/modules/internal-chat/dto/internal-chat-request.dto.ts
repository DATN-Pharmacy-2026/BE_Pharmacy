import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class InternalChatContextDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;
}

export class InternalChatRequestDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => InternalChatContextDto)
  context?: InternalChatContextDto;
}
