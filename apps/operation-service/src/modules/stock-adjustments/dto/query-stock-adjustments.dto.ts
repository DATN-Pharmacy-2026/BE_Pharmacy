import { ApiPropertyOptional } from '@nestjs/swagger';
import { StockAdjustmentStatus } from '.prisma/client/operation';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryStockAdjustmentsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 20;

  @ApiPropertyOptional() @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional() @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ enum: StockAdjustmentStatus })
  @IsOptional() @IsEnum(StockAdjustmentStatus)
  status?: StockAdjustmentStatus;

  @ApiPropertyOptional() @IsOptional()
  createdByUserId?: string;

  @ApiPropertyOptional() @IsOptional()
  approvedByUserId?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  search?: string;
}
