import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel, NotificationEventType } from '.prisma/client/reporting';
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, Matches } from 'class-validator';
import { NOTIFICATION_TEMPLATE_CODE_REGEX } from '../notification-template.constants';

export class CreateNotificationTemplateDto {
  @ApiProperty()
  @IsString()
  @Matches(NOTIFICATION_TEMPLATE_CODE_REGEX)
  code!: string;

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
  subject?: string;

  @ApiProperty()
  @IsString()
  titleTemplate!: string;

  @ApiProperty()
  @IsString()
  messageTemplate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  htmlTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;
}
