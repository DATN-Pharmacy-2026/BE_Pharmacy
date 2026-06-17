import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { QueryInventoryDto } from './query-inventory.dto';

export class QueryExpiringInventoryDto extends QueryInventoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  beforeDate?: string;

  @ApiPropertyOptional({ default: 30, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  days?: number;
}
