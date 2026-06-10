import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentGatewayProvider } from '.prisma/client/commerce';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class InitiatePaymentGatewayDto {
  @ApiPropertyOptional()
  @IsOptional()
  paymentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  orderId?: string;

  @ApiProperty({ enum: PaymentGatewayProvider })
  @IsEnum(PaymentGatewayProvider)
  provider!: PaymentGatewayProvider;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional({ default: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  returnUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  ipnUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  customerUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
