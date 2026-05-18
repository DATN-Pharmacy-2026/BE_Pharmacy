import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CheckoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cartId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
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
  note?: string;

  @ApiProperty({ enum: ['COD', 'MOCK'] })
  @IsString()
  @IsIn(['COD', 'MOCK'])
  paymentMethod!: 'COD' | 'MOCK';
}
