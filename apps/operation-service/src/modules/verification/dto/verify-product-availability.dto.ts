import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class VerifyProductAvailabilityDto {
  @ApiProperty()
  productId!: string;

  @ApiProperty()
  warehouseId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  branchId?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  excludeExpired?: boolean = true;
}
