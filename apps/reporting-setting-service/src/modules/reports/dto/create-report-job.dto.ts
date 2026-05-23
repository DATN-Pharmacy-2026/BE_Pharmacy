import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateReportJobDto {
  @ApiProperty()
  @IsString()
  reportType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  requestedByUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional({
    oneOf: [
      { type: 'object' },
      { type: 'array', items: {} },
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
    ],
  })
  @IsOptional()
  filters?: unknown;
}
