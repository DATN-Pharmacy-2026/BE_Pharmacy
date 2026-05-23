import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';

export class VerifyPosSaleItemDto {
  @ApiProperty()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  batchId?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class VerifyPosSaleDto {
  @ApiProperty()
  branchId!: string;

  @ApiProperty()
  storeId!: string;

  @ApiProperty()
  posTerminalId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  posSessionId?: string;

  @ApiProperty()
  warehouseId!: string;

  @ApiProperty({ type: [VerifyPosSaleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VerifyPosSaleItemDto)
  items!: VerifyPosSaleItemDto[];
}
