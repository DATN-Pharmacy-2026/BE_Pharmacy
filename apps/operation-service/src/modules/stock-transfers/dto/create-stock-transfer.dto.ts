import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';

export class CreateStockTransferItemDto {
  @ApiProperty()
  productId!: string;

  @ApiProperty()
  batchId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  requestedQty!: number;
}

export class CreateStockTransferDto {
  @ApiProperty()
  fromWarehouseId!: string;

  @ApiProperty()
  toWarehouseId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  fromBranchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  toBranchId?: string;

  @ApiProperty({ type: [CreateStockTransferItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateStockTransferItemDto)
  items!: CreateStockTransferItemDto[];
}
