import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '.prisma/client/reporting';
import { ReportingPrismaService } from '../../prisma/reporting-prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'refreshtokenhash',
  'secret',
  'apikey',
  'authorization',
  'otp',
  'resettoken',
  'verificationtoken',
]);

@Injectable()
export class AuditLogWriterService {
  private readonly logger = new Logger(AuditLogWriterService.name);

  constructor(private readonly prisma: ReportingPrismaService) {}

  maskSensitiveData(input: unknown): unknown {
    if (Array.isArray(input)) {
      return input.map((item) => this.maskSensitiveData(item));
    }
    if (input && typeof input === 'object') {
      const source = input as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(source)) {
        out[key] = SENSITIVE_KEYS.has(key.toLowerCase())
          ? '***MASKED***'
          : this.maskSensitiveData(value);
      }
      return out;
    }
    return input;
  }

  async write(params: CreateAuditLogDto) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          actorUserId: params.actorUserId ?? null,
          branchId: params.branchId ?? null,
          warehouseId: params.warehouseId ?? null,
          serviceName: params.serviceName,
          module: params.module,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId ?? null,
          beforeData:
            params.beforeData === undefined
              ? undefined
              : (this.maskSensitiveData(params.beforeData) as Prisma.InputJsonValue),
          afterData:
            params.afterData === undefined
              ? undefined
              : (this.maskSensitiveData(params.afterData) as Prisma.InputJsonValue),
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
        },
      });
    } catch (error) {
      this.logger.error('Failed to write audit log', error as Error);
      return null;
    }
  }
}
