import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { QueryInventoryDto } from './query-inventory.dto';

export class QueryLowStockInventoryDto extends QueryInventoryDto {
  @ApiPropertyOptional({ default: 10, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  threshold?: number;
}
