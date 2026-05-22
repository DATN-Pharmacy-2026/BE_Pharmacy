import { ApiProperty } from '@nestjs/swagger';
import { StockAdjustmentStatus } from '.prisma/client/operation';
import { IsEnum } from 'class-validator';

export class UpdateStockAdjustmentStatusDto {
  @ApiProperty({ enum: StockAdjustmentStatus })
  @IsEnum(StockAdjustmentStatus)
  status!: StockAdjustmentStatus;
}
