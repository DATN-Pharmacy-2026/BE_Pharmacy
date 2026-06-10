import { ApiPropertyOptional } from '@nestjs/swagger';
import { POSOrderStatus } from '.prisma/client/operation';
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

export class QueryPosOrdersDto {
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
  orderNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  posTerminalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  posSessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  cashierUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  customerUserId?: string;

  @ApiPropertyOptional({ enum: POSOrderStatus })
  @IsOptional()
  @IsEnum(POSOrderStatus)
  status?: POSOrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
