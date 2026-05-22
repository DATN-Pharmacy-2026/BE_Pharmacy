import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationEventStatus } from '.prisma/client/reporting';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class MarkNotificationReadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  readAt?: string;

  @ApiPropertyOptional({ enum: NotificationEventStatus, default: NotificationEventStatus.READ })
  @IsOptional()
  @IsEnum(NotificationEventStatus)
  status?: NotificationEventStatus;
}
