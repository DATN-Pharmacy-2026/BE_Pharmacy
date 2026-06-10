import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';
import { ResponseInterceptor } from '../interceptors/response.interceptor';

interface BootstrapHttpAppOptions {
  module: unknown;
  serviceName: string;
  portEnvKey: string;
}

export async function bootstrapHttpApp(
  options: BootstrapHttpAppOptions,
): Promise<void> {
  const app = await NestFactory.create(options.module as never, {
    bodyParser: false,
  });
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
  const corsOriginsRaw = configService.get<string>(
    'gateway.corsOrigins',
    'http://localhost:4008,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000',
  );
  const corsOrigins = corsOriginsRaw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  app.use(
    helmet({
      contentSecurityPolicy:
        nodeEnv === 'development'
          ? false
          : {
              directives: {
                defaultSrc: ["'self'"],
              },
            },
    }),
  );
  app.use(json({ limit: '8mb' }));
  app.use(urlencoded({ extended: true, limit: '8mb' }));
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle(options.serviceName + ' API')
    .setDescription('API documentation for ' + options.serviceName)
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDoc);

  const port = configService.get<number>(options.portEnvKey, 3000);
  await app.listen(port);
}
