import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';

export class CreateStockTransferItemDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @IsUUID()
  batchId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  requestedQty!: number;
}

export class CreateStockTransferDto {
  @ApiProperty()
  @IsUUID()
  fromWarehouseId!: string;

  @ApiProperty()
  @IsUUID()
  toWarehouseId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fromBranchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  toBranchId?: string;

  @ApiProperty({ type: [CreateStockTransferItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateStockTransferItemDto)
  items!: CreateStockTransferItemDto[];
}
