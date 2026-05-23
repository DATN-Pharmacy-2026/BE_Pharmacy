import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseOrderStatus } from '.prisma/client/operation';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdatePurchaseOrderStatusDto {
  @ApiProperty({ enum: PurchaseOrderStatus })
  @IsEnum(PurchaseOrderStatus)
  status!: PurchaseOrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  approvedByUserId?: string;
}
