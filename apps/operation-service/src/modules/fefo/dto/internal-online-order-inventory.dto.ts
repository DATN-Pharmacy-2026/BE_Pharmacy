import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class InternalOnlineOrderItemDto {
  @IsString()
  productId!: string;

  @IsString()
  orderItemId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class InternalReserveOnlineOrderDto {
  @IsString()
  orderId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  warehouseId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InternalOnlineOrderItemDto)
  items!: InternalOnlineOrderItemDto[];
}

export class InternalOnlineOrderActionDto {
  @IsString()
  orderId!: string;
}
