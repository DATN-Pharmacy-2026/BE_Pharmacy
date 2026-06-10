import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CreateNotificationEventDto } from './dto/create-notification-event.dto';
import { MarkNotificationReadDto } from './dto/mark-notification-read.dto';
import { PublishNotificationEventDto } from './dto/publish-notification-event.dto';
import { QueryNotificationEventsDto } from './dto/query-notification-events.dto';
import { NotificationEventPublisherService } from './notification-event-publisher.service';
import { NotificationEventsService } from './notification-events.service';

@ApiTags('notification-events')
@ApiHeader({ name: 'x-branch-id', required: false })
@ApiHeader({ name: 'x-warehouse-id', required: false })
@Controller('api/notification-events')
export class NotificationEventsController {
  constructor(
    private readonly notificationEventsService: NotificationEventsService,
    private readonly notificationEventPublisherService: NotificationEventPublisherService,
  ) {}

  @Get()
  findAll(@Query() query: QueryNotificationEventsDto) {
    return this.notificationEventsService.findAll(query);
  }

  @Get('unread-count')
  unreadCount(
    @Query('recipientUserId') recipientUserId?: string,
    @Query('branchId') branchId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('severity') severity?: string,
    @Query('type') type?: string,
  ) {
    return this.notificationEventsService.unreadCount({
      recipientUserId,
      branchId,
      warehouseId,
      severity,
      type,
    });
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.notificationEventsService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateNotificationEventDto,
    @Headers('x-branch-id') branchIdHeader?: string,
    @Headers('x-warehouse-id') warehouseIdHeader?: string,
  ) {
    return this.notificationEventsService.create({
      ...dto,
      branchId: dto.branchId ?? branchIdHeader,
      warehouseId: dto.warehouseId ?? warehouseIdHeader,
    });
  }

  @Post('publish')
  publish(
    @Body() dto: PublishNotificationEventDto,
    @Headers('x-branch-id') branchIdHeader?: string,
    @Headers('x-warehouse-id') warehouseIdHeader?: string,
  ) {
    return this.notificationEventPublisherService.publish({
      ...dto,
      branchId: dto.branchId ?? branchIdHeader,
      warehouseId: dto.warehouseId ?? warehouseIdHeader,
    });
  }

  @Patch(':id/read')
  markRead(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: MarkNotificationReadDto,
  ) {
    return this.notificationEventsService.markRead(id, dto);
  }

  @Patch('read-all')
  markAllRead(
    @Body()
    dto: {
      recipientUserId?: string;
      branchId?: string;
      warehouseId?: string;
      readAt?: string;
    },
  ) {
    return this.notificationEventsService.markAllRead(dto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.notificationEventsService.remove(id);
  }
}
