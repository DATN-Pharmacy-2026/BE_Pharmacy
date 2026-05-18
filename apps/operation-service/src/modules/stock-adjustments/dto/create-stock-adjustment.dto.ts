import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class CreateStockAdjustmentItemDto {
  @ApiProperty() @IsUUID()
  productId!: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  batchId?: string;

  @ApiProperty() @Type(() => Number) @IsInt() @Min(0)
  newQuantity!: number;
}

export class CreateStockAdjustmentDto {
  @ApiProperty() @IsUUID()
  warehouseId!: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  branchId?: string;

  @ApiProperty() @IsString()
  reason!: string;

  @ApiProperty({ type: [CreateStockAdjustmentItemDto] })
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => CreateStockAdjustmentItemDto)
  items!: CreateStockAdjustmentItemDto[];
}
