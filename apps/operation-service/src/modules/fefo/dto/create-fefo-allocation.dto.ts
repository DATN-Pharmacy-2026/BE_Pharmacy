import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AllocationOrderType } from '.prisma/client/operation';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class CreateFefoAllocationDto {
  @ApiProperty()
  productId!: string;

  @ApiProperty({ enum: AllocationOrderType })
  @IsEnum(AllocationOrderType)
  orderType!: AllocationOrderType;

  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  orderItemId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  branchId?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  strict?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  excludeExpired?: boolean = true;
}
