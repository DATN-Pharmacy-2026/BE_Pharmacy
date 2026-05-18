import { ApiProperty } from '@nestjs/swagger';
import { StockTransferStatus } from '.prisma/client/operation';
import { IsEnum } from 'class-validator';

export class UpdateStockTransferStatusDto {
  @ApiProperty({ enum: StockTransferStatus })
  @IsEnum(StockTransferStatus)
  status!: StockTransferStatus;
}
