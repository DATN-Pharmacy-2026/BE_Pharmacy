import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '.prisma/client/reporting';
import { AuditLogWriterService } from '../audit-logs/audit-log-writer.service';
import { ReportingPrismaService } from '../../prisma/reporting-prisma.service';
import { CreateNotificationPreferenceDto } from './dto/create-notification-preference.dto';
import { QueryNotificationPreferencesDto } from './dto/query-notification-preferences.dto';
import { ResolveNotificationPreferenceDto } from './dto/resolve-notification-preference.dto';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';
import { NotificationPreferenceResolverService } from './notification-preference-resolver.service';

@Injectable()
export class NotificationPreferencesService {
  constructor(
    private readonly prisma: ReportingPrismaService,
    private readonly resolver: NotificationPreferenceResolverService,
    private readonly auditLogWriterService: AuditLogWriterService,
  ) {}

  async findAll(query: QueryNotificationPreferencesDto) {
    const {
      page = 1,
      limit = 20,
      userId,
      branchId,
      warehouseId,
      eventType,
      channel,
      enabled,
    } = query;
    const where: Prisma.NotificationPreferenceWhereInput = {
      ...(userId ? { userId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(eventType ? { eventType } : {}),
      ...(channel ? { channel } : {}),
      ...(enabled !== undefined ? { enabled } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notificationPreference.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notificationPreference.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const found = await this.prisma.notificationPreference.findUnique({
      where: { id },
    });
    if (!found)
      throw new NotFoundException('notification preference not found');
    return found;
  }

  async create(dto: CreateNotificationPreferenceDto) {
    try {
      const existing = await this.prisma.notificationPreference.findFirst({
        where: {
          userId: dto.userId ?? null,
          branchId: dto.branchId ?? null,
          warehouseId: dto.warehouseId ?? null,
          eventType: dto.eventType,
          channel: dto.channel,
        },
      });

      const created = existing
        ? await this.prisma.notificationPreference.update({
            where: { id: existing.id },
            data: {
              enabled: dto.enabled ?? true,
              severityThreshold: dto.severityThreshold ?? null,
              quietHoursStart: dto.quietHoursStart ?? null,
              quietHoursEnd: dto.quietHoursEnd ?? null,
              timezone: dto.timezone ?? null,
            },
          })
        : await this.prisma.notificationPreference.create({
            data: {
              ...dto,
              userId: dto.userId ?? null,
              branchId: dto.branchId ?? null,
              warehouseId: dto.warehouseId ?? null,
              enabled: dto.enabled ?? true,
              severityThreshold: dto.severityThreshold ?? null,
              quietHoursStart: dto.quietHoursStart ?? null,
              quietHoursEnd: dto.quietHoursEnd ?? null,
              timezone: dto.timezone ?? null,
            },
          });

      void this.auditLogWriterService.write({
        actorUserId: dto.userId,
        branchId: dto.branchId,
        warehouseId: dto.warehouseId,
        serviceName: 'reporting-setting-service',
        module: 'notification-preferences',
        action: 'create',
        entityType: 'NotificationPreference',
        entityId: created.id,
        afterData: created,
      });

      return created;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('duplicate preference scope');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateNotificationPreferenceDto) {
    const existing = await this.findOne(id);
    const updated = await this.prisma.notificationPreference.update({
      where: { id },
      data: {
        ...dto,
        severityThreshold: dto.severityThreshold ?? undefined,
        quietHoursStart: dto.quietHoursStart ?? undefined,
        quietHoursEnd: dto.quietHoursEnd ?? undefined,
        timezone: dto.timezone ?? undefined,
      },
    });

    void this.auditLogWriterService.write({
      actorUserId: existing.userId ?? undefined,
      branchId: existing.branchId ?? undefined,
      warehouseId: existing.warehouseId ?? undefined,
      serviceName: 'reporting-setting-service',
      module: 'notification-preferences',
      action: 'update',
      entityType: 'NotificationPreference',
      entityId: updated.id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    await this.prisma.notificationPreference.delete({ where: { id } });

    void this.auditLogWriterService.write({
      actorUserId: existing.userId ?? undefined,
      branchId: existing.branchId ?? undefined,
      warehouseId: existing.warehouseId ?? undefined,
      serviceName: 'reporting-setting-service',
      module: 'notification-preferences',
      action: 'delete',
      entityType: 'NotificationPreference',
      entityId: existing.id,
      beforeData: existing,
    });

    return { deleted: true };
  }

  resolve(dto: ResolveNotificationPreferenceDto) {
    return this.resolver.resolve(dto);
  }
}
