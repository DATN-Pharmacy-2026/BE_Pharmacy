import { ApiPropertyOptional } from '@nestjs/swagger';
import { SettingScope } from '.prisma/client/reporting';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class UpdateSettingDto {
  @ApiPropertyOptional({
    oneOf: [
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
      { type: 'array', items: {} },
      { type: 'object' },
    ],
  })
  @IsOptional()
  value?: unknown;

  @ApiPropertyOptional({ enum: SettingScope })
  @IsOptional()
  @IsEnum(SettingScope)
  scope?: SettingScope;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
