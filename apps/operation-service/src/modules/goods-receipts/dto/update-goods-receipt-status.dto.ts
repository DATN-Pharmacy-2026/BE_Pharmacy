import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GoodsReceiptStatus } from '.prisma/client/operation';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class UpdateGoodsReceiptStatusDto {
  @ApiProperty({ enum: GoodsReceiptStatus })
  @IsEnum(GoodsReceiptStatus)
  status!: GoodsReceiptStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  receivedAt?: string;
}
