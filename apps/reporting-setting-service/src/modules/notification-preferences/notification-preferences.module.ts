import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferenceResolverService } from './notification-preference-resolver.service';
import { NotificationPreferencesService } from './notification-preferences.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [NotificationPreferencesController],
  providers: [NotificationPreferencesService, NotificationPreferenceResolverService],
  exports: [NotificationPreferencesService, NotificationPreferenceResolverService],
})
export class NotificationPreferencesModule {}
