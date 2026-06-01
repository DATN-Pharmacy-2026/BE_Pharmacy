import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration, validateEnv } from '@app/config';
import {
  createCorrelationIdMiddleware,
  createRequestLoggingMiddleware,
  LoggerModule,
} from '@app/logger';
import { HealthController } from './health/health.controller';
import { ChatModule } from './modules/chat/chat.module';
import { RagModule } from './modules/rag/rag.module';
import { IngestModule } from './modules/ingest/ingest.module';
import { SafetyModule } from './modules/safety/safety.module';
import { HandoffModule } from './modules/handoff/handoff.module';
import { ConversationModule } from './modules/conversation/conversation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    LoggerModule,
    ChatModule,
    RagModule,
    IngestModule,
    SafetyModule,
    HandoffModule,
    ConversationModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(
        createCorrelationIdMiddleware(),
        createRequestLoggingMiddleware('chatbot-service'),
      )
      .forRoutes('*');
  }
}
