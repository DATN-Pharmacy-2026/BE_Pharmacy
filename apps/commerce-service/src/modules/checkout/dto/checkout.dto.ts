import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CheckoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  cartId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  assignedWarehouseId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  customerName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  customerPhone!: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  shippingAddress!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientRequestId?: string;

  @ApiProperty({ enum: ['COD', 'MOCK', 'VNPAY', 'MOMO'] })
  @IsString()
  @IsIn(['COD', 'MOCK', 'VNPAY', 'MOMO'])
  paymentMethod!: 'COD' | 'MOCK' | 'VNPAY' | 'MOMO';
}
