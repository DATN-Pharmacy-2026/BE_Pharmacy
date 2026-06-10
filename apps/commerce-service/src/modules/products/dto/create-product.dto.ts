import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '.prisma/client/commerce';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty()
  @IsUUID()
  categoryId!: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  sku!: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value?.trim()))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  barcode?: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  slug!: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value?.trim()))
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value?.trim()))
  @IsOptional()
  @IsString()
  indication?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value?.trim()))
  @IsOptional()
  @IsString()
  activeIngredient?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value?.trim()))
  @IsOptional()
  @IsString()
  dosageForm?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value?.trim()))
  @IsOptional()
  @IsString()
  strength?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value?.trim()))
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiProperty()
  @IsBoolean()
  requiresPrescription!: boolean;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  unit!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  basePrice!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStockLevel?: number;

  @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.DRAFT })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
