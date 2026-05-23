import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class OpenPosSessionDto {
  @ApiProperty()
  branchId!: string;

  @ApiProperty()
  storeId!: string;

  @ApiProperty()
  posTerminalId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  openingCash?: number;
}
