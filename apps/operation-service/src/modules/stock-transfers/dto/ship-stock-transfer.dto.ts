import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ShipStockTransferItemDto {
  @ApiProperty()
  stockTransferItemId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  shippedQty!: number;
}

export class ShipStockTransferDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  carrierName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackingNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  shippedAt?: string;

  @ApiPropertyOptional({ type: [ShipStockTransferItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipStockTransferItemDto)
  items?: ShipStockTransferItemDto[];
}
