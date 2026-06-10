import { ApiPropertyOptional } from '@nestjs/swagger';
import { POSSessionStatus } from '.prisma/client/operation';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class QueryPosSessionsDto {
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
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  posTerminalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  cashierUserId?: string;

  @ApiPropertyOptional({ enum: POSSessionStatus })
  @IsOptional()
  @IsEnum(POSSessionStatus)
  status?: POSSessionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
