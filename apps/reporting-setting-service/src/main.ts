import { bootstrapHttpApp } from '@app/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  await bootstrapHttpApp({
    module: AppModule,
    serviceName: 'reporting-setting-service',
    portEnvKey: 'REPORTING_SETTING_SERVICE_PORT',
  });
}

void bootstrap();
