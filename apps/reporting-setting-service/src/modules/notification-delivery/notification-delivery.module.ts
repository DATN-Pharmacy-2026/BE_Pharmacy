import { forwardRef, Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationEventsModule } from '../notification-events/notification-events.module';
import { NotificationPreferencesModule } from '../notification-preferences/notification-preferences.module';
import { NotificationTemplatesModule } from '../notification-templates/notification-templates.module';
import { NotificationDeliveryController } from './notification-delivery.controller';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationEmailService } from './notification-email.service';
import { NotificationWebsocketGateway } from './notification-websocket.gateway';
import { NotificationWebsocketService } from './notification-websocket.service';

@Module({
  imports: [
    AuditLogsModule,
    forwardRef(() => NotificationEventsModule),
    NotificationPreferencesModule,
    NotificationTemplatesModule,
  ],
  controllers: [NotificationDeliveryController],
  providers: [
    NotificationDeliveryService,
    NotificationEmailService,
    NotificationWebsocketGateway,
    NotificationWebsocketService,
  ],
  exports: [NotificationDeliveryService, NotificationWebsocketService],
})
export class NotificationDeliveryModule {}
