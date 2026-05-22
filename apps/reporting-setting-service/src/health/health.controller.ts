import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): { service: string; status: string; timestamp: string } {
    return {
      service: 'reporting-setting-service',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
