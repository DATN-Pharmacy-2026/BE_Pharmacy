import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OpenPosSessionDto {
  @ApiProperty()
  @IsString()
  branchId!: string;

  @ApiProperty()
  @IsString()
  storeId!: string;

  @ApiProperty()
  @IsString()
  posTerminalId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  openingCash?: number;
}
