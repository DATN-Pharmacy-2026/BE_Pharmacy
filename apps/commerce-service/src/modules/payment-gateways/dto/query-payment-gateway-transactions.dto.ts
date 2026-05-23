import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentGatewayProvider, PaymentGatewayTransactionStatus } from '.prisma/client/commerce';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryPaymentGatewayTransactionsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: PaymentGatewayProvider })
  @IsOptional() @IsEnum(PaymentGatewayProvider)
  provider?: PaymentGatewayProvider;

  @ApiPropertyOptional({ enum: PaymentGatewayTransactionStatus })
  @IsOptional() @IsEnum(PaymentGatewayTransactionStatus)
  status?: PaymentGatewayTransactionStatus;

  @ApiPropertyOptional() @IsOptional()
  paymentId?: string;

  @ApiPropertyOptional() @IsOptional()
  orderId?: string;

  @ApiPropertyOptional() @IsOptional()
  branchId?: string;

  @ApiPropertyOptional() @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional() @IsOptional()
  customerUserId?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ enum: ['createdAt', 'updatedAt', 'status', 'provider'], default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
