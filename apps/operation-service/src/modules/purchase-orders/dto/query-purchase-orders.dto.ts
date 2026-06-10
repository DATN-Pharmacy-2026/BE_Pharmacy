import { ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseOrderStatus } from '.prisma/client/operation';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryPurchaseOrdersDto {
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
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ enum: PurchaseOrderStatus })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  orderedByUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  approvedByUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
