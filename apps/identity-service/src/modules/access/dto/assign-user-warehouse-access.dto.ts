import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccessStatus } from '.prisma/client/identity';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class AssignUserWarehouseAccessDto {
  @ApiProperty()
  warehouseId!: string;

  @ApiPropertyOptional()
  @IsOptional()
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
