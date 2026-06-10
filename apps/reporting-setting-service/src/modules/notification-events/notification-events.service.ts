import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Optional,
  NotFoundException,
} from '@nestjs/common';
import { NotificationEventStatus, Prisma } from '.prisma/client/reporting';
import { AuditLogWriterService } from '../audit-logs/audit-log-writer.service';
import { NotificationWebsocketService } from '../notification-delivery/notification-websocket.service';
import { ReportingPrismaService } from '../../prisma/reporting-prisma.service';
import { CreateNotificationEventDto } from './dto/create-notification-event.dto';
import { MarkNotificationReadDto } from './dto/mark-notification-read.dto';
import { QueryNotificationEventsDto } from './dto/query-notification-events.dto';

@Injectable()
export class NotificationEventsService {
  constructor(
    private readonly prisma: ReportingPrismaService,
    private readonly auditLogWriterService: AuditLogWriterService,
    @Optional()
    @Inject(forwardRef(() => NotificationWebsocketService))
    private readonly notificationWebsocketService?: NotificationWebsocketService,
  ) {}

  async findAll(query: QueryNotificationEventsDto) {
    const {
      page = 1,
      limit = 20,
      recipientUserId,
      branchId,
      warehouseId,
      type,
      channel,
      severity,
      status,
      sourceService,
      sourceModule,
      sourceEntityType,
      sourceEntityId,
      unreadOnly,
      dateFrom,
      dateTo,
      q,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const allowedSortFields = ['createdAt', 'status', 'severity', 'type'];
    if (!allowedSortFields.includes(sortBy)) {
      throw new BadRequestException('Invalid sort field');
    }
    const normalizedQ = q?.trim();
    const where: Prisma.NotificationEventWhereInput = {
      ...(recipientUserId ? { recipientUserId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(type ? { type } : {}),
      ...(channel ? { channel } : {}),
      ...(severity ? { severity } : {}),
      ...(status ? { status } : {}),
      ...(sourceService ? { sourceService } : {}),
      ...(sourceModule ? { sourceModule } : {}),
      ...(sourceEntityType ? { sourceEntityType } : {}),
      ...(sourceEntityId ? { sourceEntityId } : {}),
      ...(unreadOnly ? { status: { not: NotificationEventStatus.READ } } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
      ...(normalizedQ
        ? {
            OR: [
              { title: { contains: normalizedQ, mode: 'insensitive' } },
              { message: { contains: normalizedQ, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notificationEvent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          type: true,
          channel: true,
          severity: true,
          title: true,
          message: true,
          recipientUserId: true,
          actorUserId: true,
          branchId: true,
          warehouseId: true,
          sourceService: true,
          sourceModule: true,
          sourceEntityType: true,
          sourceEntityId: true,
          status: true,
          readAt: true,
          deliveredAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.notificationEvent.count({ where }),
    ]);
    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const found = await this.prisma.notificationEvent.findUnique({
      where: { id },
    });
    if (!found) throw new NotFoundException('notification event not found');
    return found;
  }

  async findExistingBySource(input: {
    type: any;
    sourceService: string;
    sourceModule?: string;
    sourceEntityType: string;
    sourceEntityId: string;
    recipientUserId?: string;
  }) {
    return this.prisma.notificationEvent.findFirst({
      where: {
        type: input.type,
        sourceService: input.sourceService,
        sourceModule: input.sourceModule ?? null,
        sourceEntityType: input.sourceEntityType,
        sourceEntityId: input.sourceEntityId,
        recipientUserId: input.recipientUserId ?? null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateNotificationEventDto) {
    const created = await this.prisma.notificationEvent.create({
      data: {
        ...dto,
        channel: dto.channel,
        severity: dto.severity,
        recipientUserId: dto.recipientUserId ?? null,
        actorUserId: dto.actorUserId ?? null,
        branchId: dto.branchId ?? null,
        warehouseId: dto.warehouseId ?? null,
        sourceModule: dto.sourceModule ?? null,
        sourceEntityType: dto.sourceEntityType ?? null,
        sourceEntityId: dto.sourceEntityId ?? null,
        payload:
          dto.payload === undefined
            ? undefined
            : (dto.payload as Prisma.InputJsonValue),
        status: dto.status ?? NotificationEventStatus.PENDING,
      },
    });

    void this.auditLogWriterService.write({
      actorUserId: created.actorUserId ?? undefined,
      branchId: created.branchId ?? undefined,
      warehouseId: created.warehouseId ?? undefined,
      serviceName: 'reporting-setting-service',
      module: 'notification-events',
      action: 'create',
      entityType: 'NotificationEvent',
      entityId: created.id,
      afterData: created,
    });
    this.notificationWebsocketService?.emitNotificationEvent(created);
    return created;
  }

  async markRead(id: string, dto: MarkNotificationReadDto = {}) {
    await this.findOne(id);
    const readAt = dto.readAt ? new Date(dto.readAt) : new Date();
    const updated = await this.prisma.notificationEvent.update({
      where: { id },
      data: {
        status: dto.status ?? NotificationEventStatus.READ,
        readAt,
      },
    });
    void this.auditLogWriterService.write({
      actorUserId: updated.actorUserId ?? undefined,
      branchId: updated.branchId ?? undefined,
      warehouseId: updated.warehouseId ?? undefined,
      serviceName: 'reporting-setting-service',
      module: 'notification-events',
      action: 'mark_read',
      entityType: 'NotificationEvent',
      entityId: updated.id,
      afterData: { status: updated.status, readAt: updated.readAt },
    });
    this.notificationWebsocketService?.emitRead(updated);
    return updated;
  }

  async markAllRead(params: {
    recipientUserId?: string;
    branchId?: string;
    warehouseId?: string;
    readAt?: string;
  }) {
    if (!params.recipientUserId && !params.branchId && !params.warehouseId) {
      throw new BadRequestException(
        'read-all requires at least one safe scope filter',
      );
    }
    const result = await this.prisma.notificationEvent.updateMany({
      where: {
        ...(params.recipientUserId
          ? { recipientUserId: params.recipientUserId }
          : {}),
        ...(params.branchId ? { branchId: params.branchId } : {}),
        ...(params.warehouseId ? { warehouseId: params.warehouseId } : {}),
        status: { not: NotificationEventStatus.READ },
      },
      data: {
        status: NotificationEventStatus.READ,
        readAt: params.readAt ? new Date(params.readAt) : new Date(),
      },
    });
    return { updated: result.count };
  }

  async unreadCount(params: {
    recipientUserId?: string;
    branchId?: string;
    warehouseId?: string;
    severity?: string;
    type?: string;
  }) {
    const count = await this.prisma.notificationEvent.count({
      where: {
        ...(params.recipientUserId
          ? { recipientUserId: params.recipientUserId }
          : {}),
        ...(params.branchId ? { branchId: params.branchId } : {}),
        ...(params.warehouseId ? { warehouseId: params.warehouseId } : {}),
        ...(params.severity ? { severity: params.severity as any } : {}),
        ...(params.type ? { type: params.type as any } : {}),
        status: { not: NotificationEventStatus.READ },
      },
    });
    return { count };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.notificationEvent.delete({ where: { id } });
    return { deleted: true };
  }
}
