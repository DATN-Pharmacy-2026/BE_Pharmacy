import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateKpiSnapshotDto {
  @ApiPropertyOptional()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  warehouseId?: string;

  @ApiProperty()
  @IsString()
  metricCode!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  metricValue!: number;

  @ApiProperty()
  @IsDateString()
  snapshotDate!: string;
}
