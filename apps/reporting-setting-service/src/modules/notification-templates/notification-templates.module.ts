import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationTemplateRendererService } from './notification-template-renderer.service';
import { NotificationTemplatesController } from './notification-templates.controller';
import { NotificationTemplatesService } from './notification-templates.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [NotificationTemplatesController],
  providers: [
    NotificationTemplatesService,
    NotificationTemplateRendererService,
  ],
  exports: [NotificationTemplatesService, NotificationTemplateRendererService],
})
export class NotificationTemplatesModule {}
