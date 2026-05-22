import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccessStatus } from '.prisma/client/identity';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class AssignUserWarehouseAccessDto {
  @ApiProperty()
  @IsUUID()
  warehouseId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiProperty()
  @IsBoolean()
  canReceiveStock!: boolean;

  @ApiProperty()
  @IsBoolean()
  canTransferStock!: boolean;

  @ApiProperty()
  @IsBoolean()
  canAdjustStock!: boolean;

  @ApiProperty({ enum: AccessStatus })
  @IsEnum(AccessStatus)
  status!: AccessStatus;
}
