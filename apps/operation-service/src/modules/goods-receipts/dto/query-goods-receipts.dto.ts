import { ApiPropertyOptional } from '@nestjs/swagger';
import { GoodsReceiptStatus } from '.prisma/client/operation';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryGoodsReceiptsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  purchaseOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ enum: GoodsReceiptStatus })
  @IsOptional()
  @IsEnum(GoodsReceiptStatus)
  status?: GoodsReceiptStatus;

  @ApiPropertyOptional()
  @IsOptional()
  receivedByUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  receivedDateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  receivedDateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
