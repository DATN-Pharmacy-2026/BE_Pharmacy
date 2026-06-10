import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationChannel,
  NotificationEventType,
} from '.prisma/client/reporting';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class RenderNotificationTemplateDto {
  @ApiProperty({ enum: NotificationEventType })
  @IsEnum(NotificationEventType)
  eventType!: NotificationEventType;

  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @ApiPropertyOptional({ default: 'vi' })
  @IsOptional()
  @IsString()
  locale?: string = 'vi';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateCode?: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  context!: Record<string, unknown>;
}
