import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { configuration, validateEnv } from '@app/config';
import {
  createCorrelationIdMiddleware,
  createRequestLoggingMiddleware,
  LoggerModule,
} from '@app/logger';
import { HealthController } from './health/health.controller';
import { AccessModule } from './modules/access/access.module';
import { AuthModule } from './modules/auth/auth.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { UsersModule } from './modules/users/users.module';
import { IdentityPrismaModule } from './prisma/identity-prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: Number.parseInt(process.env.IDENTITY_THROTTLE_TTL_MS ?? process.env.GATEWAY_THROTTLE_TTL_MS ?? '60000', 10),
        limit: Number.parseInt(process.env.IDENTITY_THROTTLE_LIMIT ?? process.env.GATEWAY_THROTTLE_LIMIT ?? '1000', 10),
      },
    ]),
    LoggerModule,
    IdentityPrismaModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    AccessModule,
    SessionsModule,
    AuthModule,
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
        createRequestLoggingMiddleware('identity-service'),
      )
      .forRoutes('*');
  }
}
