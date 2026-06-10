import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationChannel,
  NotificationEventStatus,
  NotificationEventType,
  NotificationSeverity,
} from '.prisma/client/reporting';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateNotificationEventDto {
  @ApiProperty({ enum: NotificationEventType })
  @IsEnum(NotificationEventType)
  type!: NotificationEventType;

  @ApiPropertyOptional({
    enum: NotificationChannel,
    default: NotificationChannel.IN_APP,
  })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiPropertyOptional({
    enum: NotificationSeverity,
    default: NotificationSeverity.INFO,
  })
  @IsOptional()
  @IsEnum(NotificationSeverity)
  severity?: NotificationSeverity;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  message!: string;

  @ApiPropertyOptional()
  @IsOptional()
  recipientUserId?: string;

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
  sourceService!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceModule?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceEntityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceEntityId?: string;

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
  payload?: unknown;

  @ApiPropertyOptional({
    enum: NotificationEventStatus,
    default: NotificationEventStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(NotificationEventStatus)
  status?: NotificationEventStatus;
}
