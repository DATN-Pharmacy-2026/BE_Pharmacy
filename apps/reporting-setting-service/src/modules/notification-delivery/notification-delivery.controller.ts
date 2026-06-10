import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DeliverNotificationDto } from './dto/deliver-notification.dto';
import { QueryDeliveryAttemptsDto } from './dto/query-delivery-attempts.dto';
import { SendTestNotificationDto } from './dto/send-test-notification.dto';
import { NotificationDeliveryService } from './notification-delivery.service';

@ApiTags('notification-delivery')
@Controller('api/notification-delivery')
export class NotificationDeliveryController {
  constructor(
    private readonly notificationDeliveryService: NotificationDeliveryService,
  ) {}

  @Get('attempts')
  listAttempts(@Query() query: QueryDeliveryAttemptsDto) {
    return this.notificationDeliveryService.listAttempts(query);
  }

  @Get('attempts/:id')
  findAttempt(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.notificationDeliveryService.findAttempt(id);
  }

  @Post('events/:notificationEventId/deliver')
  deliverEvent(
    @Param('notificationEventId', new ParseUUIDPipe())
    notificationEventId: string,
    @Body() dto: DeliverNotificationDto,
  ) {
    return this.notificationDeliveryService.deliverEvent(
      notificationEventId,
      dto,
    );
  }

  @Post('test')
  sendTest(@Body() dto: SendTestNotificationDto) {
    return this.notificationDeliveryService.sendTestNotification(dto);
  }
}
