import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateAuditLogDto {
  @ApiPropertyOptional()
  @IsOptional()
  actorUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
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
  entityId?: string;

  @ApiPropertyOptional({
    oneOf: [
      { type: 'object' },
      { type: 'array', items: {} },
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
    ],
  })
  @IsOptional()
  beforeData?: unknown;

  @ApiPropertyOptional({
    oneOf: [
      { type: 'object' },
      { type: 'array', items: {} },
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
    ],
  })
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
