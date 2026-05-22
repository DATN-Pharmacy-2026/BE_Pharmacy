import { bootstrapHttpApp } from '@app/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  await bootstrapHttpApp({
    module: AppModule,
    serviceName: 'notification-service',
    portEnvKey: 'NOTIFICATION_SERVICE_PORT',
  });
}

void bootstrap();
