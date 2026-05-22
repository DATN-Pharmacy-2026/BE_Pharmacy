import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { API_GROUPS, SERVICE_TARGETS } from '../../contracts';

@Injectable()
export class DocsService {
  constructor(private readonly configService: ConfigService) {}

  getRouteGroups() {
    return API_GROUPS.map((group) => ({
      group: group.group,
      description: group.description,
      targetService: group.targetService,
      routes: [...group.routes],
      authRequired: group.authRequired,
    }));
  }

  getServiceTargets() {
    return SERVICE_TARGETS.map((target) => ({
      serviceName: target.serviceName,
      url: process.env[target.envKey] ?? target.defaultUrl,
      healthPath: target.healthPath,
    }));
  }

  getConventions() {
    return {
      frontendEntryPoint: 'Frontend must call API Gateway only',
      baseUrl: 'http://localhost:3000/api',
      authorization:
        'Forwarded as-is to internal services. RBAC is enforced by internal services.',
      requestId:
        'x-correlation-id/x-request-id are optional. Gateway reuses if provided, otherwise generates and forwards downstream.',
      standardErrorBehavior:
        'Gateway preserves downstream status and returns 503 with service metadata when downstream is unavailable.',
      internalServiceUsage:
        'Internal service URLs are for development/debug only.',
      timestamp: new Date().toISOString(),
    };
  }
}
