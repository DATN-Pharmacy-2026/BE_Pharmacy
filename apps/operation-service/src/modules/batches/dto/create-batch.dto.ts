import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BatchStatus } from '.prisma/client/operation';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateBatchDto {
  @ApiProperty()
  productId!: string;

  @ApiProperty()
  @IsString()
  batchNo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  manufactureDate?: string;

  @ApiProperty()
  @IsDateString()
  expiryDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ enum: BatchStatus })
  @IsOptional()
  @IsEnum(BatchStatus)
  status?: BatchStatus;
}
