import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SettingScope } from '.prisma/client/reporting';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSettingDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  key!: string;

  @ApiProperty({
    description: 'JSON value for setting',
    oneOf: [
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
      { type: 'array', items: {} },
      { type: 'object' },
    ],
  })
  value!: unknown;

  @ApiPropertyOptional({ enum: SettingScope, default: SettingScope.SYSTEM })
  @IsOptional()
  @IsEnum(SettingScope)
  scope?: SettingScope;

  @ApiPropertyOptional()
  @IsOptional()
  branchId?: string;
}
