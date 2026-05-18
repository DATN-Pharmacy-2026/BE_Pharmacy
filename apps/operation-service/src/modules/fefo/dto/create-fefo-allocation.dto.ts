import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AllocationOrderType } from '.prisma/client/operation';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateFefoAllocationDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ enum: AllocationOrderType })
  @IsEnum(AllocationOrderType)
  orderType!: AllocationOrderType;

  @ApiProperty()
  @IsUUID()
  orderId!: string;

  @ApiProperty()
  @IsUUID()
  orderItemId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
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
