import { Controller, Get } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  getHealth(): { service: string; status: string; timestamp: string } {
    return {
      service: 'gateway',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('services')
  async getServicesHealth() {
    const timeout = 2000;
    const serviceConfigs = [
      {
        name: 'identity-service',
        url: this.configService.getOrThrow<string>('gateway.services.identity'),
      },
      {
        name: 'commerce-service',
        url: this.configService.getOrThrow<string>('gateway.services.commerce'),
      },
      {
        name: 'operation-service',
        url: this.configService.getOrThrow<string>(
          'gateway.services.operation',
        ),
      },
      {
        name: 'reporting-setting-service',
        url: this.configService.getOrThrow<string>(
          'gateway.services.reportingSetting',
        ),
      },
      {
        name: 'notification-service',
        url: this.configService.getOrThrow<string>(
          'gateway.services.notification',
        ),
      },
      {
        name: 'chatbot-service',
        url: this.configService.getOrThrow<string>('gateway.services.chatbot'),
      },
    ];

    const checks = await Promise.all(
      serviceConfigs.map(async (service) => {
        try {
          await firstValueFrom(
            this.httpService.get(`${service.url}/api/health`, {
              timeout,
            }),
          );
          return [service.name, { status: 'ok', url: service.url }] as const;
        } catch {
          return [
            service.name,
            { status: 'unavailable', url: service.url },
          ] as const;
        }
      }),
    );

    return {
      gateway: 'ok',
      services: Object.fromEntries(checks),
      timestamp: new Date().toISOString(),
    };
  }
}
