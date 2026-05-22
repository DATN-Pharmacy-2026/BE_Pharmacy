import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAuditLogDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiProperty()
  @IsString()
  serviceName!: string;

  @ApiProperty()
  @IsString()
  module!: string;

  @ApiProperty()
  @IsString()
  action!: string;

  @ApiProperty()
  @IsString()
  entityType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({ oneOf: [{ type: 'object' }, { type: 'array', items: {} }, { type: 'string' }, { type: 'number' }, { type: 'boolean' }] })
  @IsOptional()
  beforeData?: unknown;

  @ApiPropertyOptional({ oneOf: [{ type: 'object' }, { type: 'array', items: {} }, { type: 'string' }, { type: 'number' }, { type: 'boolean' }] })
  @IsOptional()
  afterData?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userAgent?: string;
}
