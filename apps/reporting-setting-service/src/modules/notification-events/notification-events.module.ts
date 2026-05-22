import { forwardRef, Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationDeliveryModule } from '../notification-delivery/notification-delivery.module';
import { NotificationEventPublisherService } from './notification-event-publisher.service';
import { NotificationEventsController } from './notification-events.controller';
import { NotificationEventsService } from './notification-events.service';

@Module({
  imports: [AuditLogsModule, forwardRef(() => NotificationDeliveryModule)],
  controllers: [NotificationEventsController],
  providers: [NotificationEventsService, NotificationEventPublisherService],
  exports: [NotificationEventsService, NotificationEventPublisherService],
})
export class NotificationEventsModule {}
