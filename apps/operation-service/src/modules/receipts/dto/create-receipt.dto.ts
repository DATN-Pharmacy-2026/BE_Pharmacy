import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateReceiptDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  posOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  onlineOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
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
