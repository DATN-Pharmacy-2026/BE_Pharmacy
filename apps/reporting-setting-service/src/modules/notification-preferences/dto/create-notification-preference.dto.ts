import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationChannel,
  NotificationEventType,
  NotificationSeverity,
} from '.prisma/client/reporting';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateNotificationPreferenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  warehouseId?: string;

  @ApiProperty({ enum: NotificationEventType })
  @IsEnum(NotificationEventType)
  eventType!: NotificationEventType;

  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @ApiPropertyOptional({ default: true })
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
