import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export enum InventoryAdjustmentType {
  INCREASE = 'INCREASE',
  DECREASE = 'DECREASE',
}

export class AdjustInventoryDto {
  @ApiProperty()
  warehouseId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  locationId?: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty({ enum: InventoryAdjustmentType })
  @IsEnum(InventoryAdjustmentType)
  adjustmentType!: InventoryAdjustmentType;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
