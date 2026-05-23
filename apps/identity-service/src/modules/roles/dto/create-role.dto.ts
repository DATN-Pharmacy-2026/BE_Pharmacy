import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { RoleScope } from '.prisma/client/identity';

export class CreateRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: RoleScope })
  @IsEnum(RoleScope)
  scope!: RoleScope;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSystemRole?: boolean;
}
