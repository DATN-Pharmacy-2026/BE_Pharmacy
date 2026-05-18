import { ApiPropertyOptional } from '@nestjs/swagger';
import { POSOrderStatus } from '.prisma/client/operation';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

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
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  posTerminalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  posSessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cashierUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
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
