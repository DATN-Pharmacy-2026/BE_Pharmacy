import { ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryMovementType } from '.prisma/client/operation';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class QueryStockMovementsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 20;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  productId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  batchId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ enum: InventoryMovementType })
  @IsOptional() @IsEnum(InventoryMovementType)
  movementType?: InventoryMovementType;

  @ApiPropertyOptional() @IsOptional() @IsString()
  referenceType?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  referenceId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  createdByUserId?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  dateTo?: string;
}
