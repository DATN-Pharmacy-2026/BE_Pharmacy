import { ApiPropertyOptional } from '@nestjs/swagger';
import { POSTerminalStatus } from '.prisma/client/operation';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryPosTerminalsDto {
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
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  storeId?: string;

  @ApiPropertyOptional({ enum: POSTerminalStatus })
  @IsOptional()
  @IsEnum(POSTerminalStatus)
  status?: POSTerminalStatus;
}
