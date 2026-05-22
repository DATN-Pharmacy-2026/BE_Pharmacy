import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class QueryInventoryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 20;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  productId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  batchId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  locationId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  branchId?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  expiryDateFrom?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  expiryDateTo?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  expiringBefore?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean()
  hasAvailableQuantity?: boolean;

  @ApiPropertyOptional({ enum: ['updatedAt', 'expiryDate', 'quantityAvailable'] })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
