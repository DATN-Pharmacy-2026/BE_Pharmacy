import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatus } from '.prisma/client/operation';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryShipmentsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  stockTransferId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shipmentNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  carrierName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackingNo?: string;

  @ApiPropertyOptional({ enum: ShipmentStatus })
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  shippedByUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  receivedByUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
