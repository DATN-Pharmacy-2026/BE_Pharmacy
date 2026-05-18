import { ApiProperty } from '@nestjs/swagger';
import { POSOrderStatus } from '.prisma/client/operation';
import { IsEnum } from 'class-validator';

export class UpdatePosOrderStatusDto {
  @ApiProperty({ enum: POSOrderStatus })
  @IsEnum(POSOrderStatus)
  status!: POSOrderStatus;
}
