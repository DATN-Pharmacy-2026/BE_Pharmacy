import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccessStatus } from '.prisma/client/identity';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class AssignUserBranchAccessDto {
  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiProperty()
  @IsBoolean()
  canAccessPOS!: boolean;

  @ApiProperty()
  @IsBoolean()
  canManageInventory!: boolean;

  @ApiProperty()
  @IsBoolean()
  canApproveTransfer!: boolean;

  @ApiProperty()
  @IsBoolean()
  isDefaultBranch!: boolean;

  @ApiProperty({ enum: AccessStatus })
  @IsEnum(AccessStatus)
  status!: AccessStatus;
}
