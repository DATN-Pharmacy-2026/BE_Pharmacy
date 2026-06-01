import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get(['health', 'api/health'])
  getHealth(): { service: string; status: string; timestamp: string } {
    return {
      service: 'chatbot-service',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
