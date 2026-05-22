import { ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class TenantContextService {
  getTenantId(headers: Record<string, unknown>): string {
    const raw = headers['x-tenant-id'] ?? headers['X-Tenant-Id'];
    if (typeof raw === 'string' && raw.trim().length > 0) return raw;
    throw new ForbiddenException('Missing x-tenant-id header');
  }
}
