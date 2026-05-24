import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { EventBusModule } from '@app/event-bus';
import { configuration, validateEnv } from '@app/config';
import {
  createCorrelationIdMiddleware,
  createRequestLoggingMiddleware,
  LoggerModule,
} from '@app/logger';
import { HealthController } from './health/health.controller';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { KpisModule } from './modules/kpis/kpis.module';
import { NotificationDeliveryModule } from './modules/notification-delivery/notification-delivery.module';
import { NotificationEventsModule } from './modules/notification-events/notification-events.module';
import { NotificationPreferencesModule } from './modules/notification-preferences/notification-preferences.module';
import { NotificationTemplatesModule } from './modules/notification-templates/notification-templates.module';
import { ReportExportsModule } from './modules/report-exports/report-exports.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SettingsModule } from './modules/settings/settings.module';
import { EventsModule } from './modules/events/events.module';
import { ReportingPrismaModule } from './prisma/reporting-prisma.module';
import { JwtStrategy } from './auth/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    LoggerModule,
    EventBusModule,
    ReportingPrismaModule,
    SettingsModule,
    AuditLogsModule,
    NotificationEventsModule,
    NotificationDeliveryModule,
    NotificationPreferencesModule,
    NotificationTemplatesModule,
    DashboardModule,
    KpisModule,
    ReportsModule,
    ReportExportsModule,
    EventsModule,
  ],
  providers: [
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(
        createCorrelationIdMiddleware(),
        createRequestLoggingMiddleware('reporting-setting-service'),
      )
      .forRoutes('*');
  }
}
