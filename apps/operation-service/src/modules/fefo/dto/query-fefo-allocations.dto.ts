import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  AllocationOrderType,
  AllocationStatus,
} from '.prisma/client/operation';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class QueryFefoAllocationsDto {
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
  productId?: string;

  @ApiPropertyOptional({ enum: AllocationOrderType })
  @IsOptional()
  @IsEnum(AllocationOrderType)
  orderType?: AllocationOrderType;

  @ApiPropertyOptional()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  orderItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  batchId?: string;

  @ApiPropertyOptional({ enum: AllocationStatus })
  @IsOptional()
  @IsEnum(AllocationStatus)
  status?: AllocationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
