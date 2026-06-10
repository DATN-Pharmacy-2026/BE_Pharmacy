import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationSeverity } from '.prisma/client/reporting';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class UpdateNotificationPreferenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ enum: NotificationSeverity })
  @IsOptional()
  @IsEnum(NotificationSeverity)
  severityThreshold?: NotificationSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  quietHoursStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  quietHoursEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;
}
