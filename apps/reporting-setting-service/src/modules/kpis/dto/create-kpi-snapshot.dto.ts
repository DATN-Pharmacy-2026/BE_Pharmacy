import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateKpiSnapshotDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
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
