import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter, ResponseInterceptor } from '@app/common';
import { LoggerService } from '@app/logger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
  const corsOriginsRaw = configService.get<string>(
    'gateway.corsOrigins',
    'http://localhost:4008,http://localhost:3000',
  );
  const allowedOrigins = corsOriginsRaw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  app.setGlobalPrefix('api');
  app.use(
    helmet({
      contentSecurityPolicy:
        nodeEnv === 'development'
          ? false
          : { directives: { defaultSrc: ["'self'"] } },
    }),
  );
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useLogger(app.get(LoggerService));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('identity-service API')
    .setDescription('API documentation for identity-service')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDoc);

  const port = configService.get<number>('ports.identityService', 3001);
  await app.listen(port);
}

void bootstrap();
