import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateStockAdjustmentItemDto {
  @ApiProperty()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  batchId?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  newQuantity!: number;
}

export class CreateStockAdjustmentDto {
  @ApiProperty()
  warehouseId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  branchId?: string;

  @ApiProperty()
  @IsString()
  reason!: string;

  @ApiProperty({ type: [CreateStockAdjustmentItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateStockAdjustmentItemDto)
  items!: CreateStockAdjustmentItemDto[];
}
