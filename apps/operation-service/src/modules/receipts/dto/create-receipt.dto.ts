import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateReceiptDto {
  @ApiPropertyOptional()
  @IsOptional()
  posOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  onlineOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  storeId?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issuedAt?: string;
}
