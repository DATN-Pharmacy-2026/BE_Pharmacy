import { ApiPropertyOptional } from '@nestjs/swagger';
import { StockTransferStatus } from '.prisma/client/operation';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryStockTransfersDto {
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
  transferNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  fromWarehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  toWarehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  fromBranchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  toBranchId?: string;

  @ApiPropertyOptional({ enum: StockTransferStatus })
  @IsOptional()
  @IsEnum(StockTransferStatus)
  status?: StockTransferStatus;

  @ApiPropertyOptional()
  @IsOptional()
  requestedByUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  approvedByUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
