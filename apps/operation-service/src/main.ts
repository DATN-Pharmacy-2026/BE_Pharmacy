import { bootstrapHttpApp } from '@app/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  await bootstrapHttpApp({
    module: AppModule,
    serviceName: 'operation-service',
    portEnvKey: 'OPERATION_SERVICE_PORT',
  });
}

void bootstrap();
