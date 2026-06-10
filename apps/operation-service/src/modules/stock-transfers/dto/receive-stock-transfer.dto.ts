import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReceiveStockTransferItemDto {
  @ApiProperty()
  stockTransferItemId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  receivedQty!: number;
}

export class ReceiveStockTransferDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @ApiPropertyOptional({ type: [ReceiveStockTransferItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveStockTransferItemDto)
  items?: ReceiveStockTransferItemDto[];
}
