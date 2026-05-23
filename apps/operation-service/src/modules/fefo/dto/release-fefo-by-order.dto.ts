import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AllocationOrderType } from '.prisma/client/operation';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReleaseFefoByOrderDto {
  @ApiProperty({ enum: AllocationOrderType })
  @IsEnum(AllocationOrderType)
  orderType!: AllocationOrderType;

  @ApiProperty()
  orderId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
