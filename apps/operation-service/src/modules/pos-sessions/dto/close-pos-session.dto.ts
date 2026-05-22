import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class ClosePosSessionDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  closingCash!: number;
}
