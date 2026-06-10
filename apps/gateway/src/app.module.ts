import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { configuration, validateEnv } from '@app/config';
import {
  createCorrelationIdMiddleware,
  createRequestLoggingMiddleware,
  LoggerModule,
} from '@app/logger';
import { HealthController } from './health/health.controller';
import { DocsModule } from './modules/docs/docs.module';
import { ProxyModule } from './modules/proxy/proxy.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: Number.parseInt(
          process.env.GATEWAY_THROTTLE_TTL_MS ?? '60000',
          10,
        ),
        limit: Number.parseInt(
          process.env.GATEWAY_THROTTLE_LIMIT ?? '1000',
          10,
        ),
      },
    ]),
    LoggerModule,
    DocsModule,
    ProxyModule,
  ],
  providers: [
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
        createRequestLoggingMiddleware('gateway'),
      )
      .forRoutes('*');
  }
}
