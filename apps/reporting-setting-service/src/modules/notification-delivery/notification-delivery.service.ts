import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationEventStatus,
  Prisma,
} from '.prisma/client/reporting';
import { AuditLogWriterService } from '../audit-logs/audit-log-writer.service';
import { NotificationEventsService } from '../notification-events/notification-events.service';
import { NotificationPreferenceResolverService } from '../notification-preferences/notification-preference-resolver.service';
import { NotificationTemplateRendererService } from '../notification-templates/notification-template-renderer.service';
import { ReportingPrismaService } from '../../prisma/reporting-prisma.service';
import { DeliverNotificationDto } from './dto/deliver-notification.dto';
import { QueryDeliveryAttemptsDto } from './dto/query-delivery-attempts.dto';
import { SendTestNotificationDto } from './dto/send-test-notification.dto';
import { NotificationEmailService } from './notification-email.service';
import { NotificationWebsocketService } from './notification-websocket.service';

@Injectable()
export class NotificationDeliveryService {
  constructor(
    private readonly prisma: ReportingPrismaService,
    private readonly notificationEventsService: NotificationEventsService,
    private readonly notificationPreferenceResolverService: NotificationPreferenceResolverService,
    private readonly notificationTemplateRendererService: NotificationTemplateRendererService,
    private readonly notificationEmailService: NotificationEmailService,
    private readonly notificationWebsocketService: NotificationWebsocketService,
    private readonly auditLogWriterService: AuditLogWriterService,
  ) {}

  async listAttempts(query: QueryDeliveryAttemptsDto) {
    const { page = 1, limit = 20, notificationEventId, channel, status, provider, dateFrom, dateTo } = query;
    const where: Prisma.NotificationDeliveryAttemptWhereInput = {
      ...(notificationEventId ? { notificationEventId } : {}),
      ...(channel ? { channel } : {}),
      ...(status ? { status } : {}),
      ...(provider ? { provider } : {}),
      ...((dateFrom || dateTo)
        ? {
            attemptedAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notificationDeliveryAttempt.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { attemptedAt: 'desc' },
      }),
      this.prisma.notificationDeliveryAttempt.count({ where }),
    ]);
    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAttempt(id: string) {
    const attempt = await this.prisma.notificationDeliveryAttempt.findUnique({
      where: { id },
    });
    if (!attempt) throw new NotFoundException('delivery attempt not found');
    return attempt;
  }

  async deliverEvent(notificationEventId: string, dto: DeliverNotificationDto = {}) {
    const event = await this.notificationEventsService.findOne(notificationEventId);
    const channels = dto.channels?.length ? dto.channels : [event.channel];
    const attempts: Array<{ status: NotificationDeliveryStatus }> = [];
    for (const channel of channels) {
      const preferenceResult = await this.notificationPreferenceResolverService.isChannelEnabledForEvent(event, channel);
      const pending = await this.prisma.notificationDeliveryAttempt.create({
        data: {
          notificationEventId: event.id,
          channel,
          status: NotificationDeliveryStatus.PENDING,
          provider: channel === NotificationChannel.EMAIL ? (process.env.NOTIFICATION_EMAIL_PROVIDER ?? 'console') : 'websocket',
          recipient:
            channel === NotificationChannel.EMAIL
              ? (dto.recipientEmail ?? this.readRecipientEmailFromPayload(event.payload))
              : (event.recipientUserId ?? event.branchId ?? event.warehouseId ?? null),
        },
      });

      let outcome: {
        status: NotificationDeliveryStatus;
        errorMessage?: string;
        response?: unknown;
      };
      if (!preferenceResult.enabled) {
        outcome = {
          status: NotificationDeliveryStatus.SKIPPED,
          errorMessage:
            preferenceResult.reason === 'QUIET_HOURS_BLOCKED'
              ? 'Blocked by quiet hours'
              : preferenceResult.reason === 'SEVERITY_BLOCKED'
                ? 'Blocked by severity threshold'
                : 'Disabled by notification preference',
          response: { reason: preferenceResult.reason },
        };
      } else {
        try {
          outcome = await this.performDelivery(event, channel, dto);
        } catch {
          outcome = {
            status: NotificationDeliveryStatus.FAILED,
            errorMessage: 'Notification delivery failed',
          };
        }
      }
      const updated = await this.prisma.notificationDeliveryAttempt.update({
        where: { id: pending.id },
        data: {
          status: outcome.status,
          deliveredAt:
            outcome.status === NotificationDeliveryStatus.DELIVERED ||
            outcome.status === NotificationDeliveryStatus.SENT
              ? new Date()
              : null,
          errorMessage: outcome.errorMessage ?? null,
          response:
            outcome.response === undefined
              ? undefined
              : (outcome.response as Prisma.InputJsonValue),
        },
      });
      attempts.push(updated);
    }

    await this.updateNotificationEventAfterDelivery(event.id, attempts);
    return {
      notificationEvent: await this.notificationEventsService.findOne(event.id),
      attempts,
      summary: this.summarizeAttempts(channels.length, attempts),
    };
  }

  async deliverEventSafely(notificationEventId: string, dto: DeliverNotificationDto = {}) {
    try {
      return await this.deliverEvent(notificationEventId, dto);
    } catch {
      return {
        notificationEvent: await this.notificationEventsService.findOne(notificationEventId),
        attempts: [],
        summary: { requested: dto.channels?.length ?? 0, sent: 0, delivered: 0, failed: 1, skipped: 0 },
      };
    }
  }

  async sendTestNotification(dto: SendTestNotificationDto) {
    const createdEvent = await this.notificationEventsService.create({
      type: 'CUSTOM' as any,
      channel: dto.channel,
      severity: 'INFO' as any,
      title: dto.title,
      message: dto.message,
      recipientUserId: dto.recipientUserId,
      branchId: dto.branchId,
      warehouseId: dto.warehouseId,
      sourceService: 'reporting-setting-service',
      sourceModule: 'notification-delivery',
      payload: {
        ...(dto.payload && typeof dto.payload === 'object' ? dto.payload : {}),
        ...(dto.recipientEmail ? { recipientEmail: dto.recipientEmail } : {}),
      },
    });
    const delivered = await this.deliverEvent(createdEvent.id, {
      channels: [dto.channel],
      recipientEmail: dto.recipientEmail,
    });

    void this.auditLogWriterService.write({
      actorUserId: createdEvent.actorUserId ?? undefined,
      branchId: createdEvent.branchId ?? undefined,
      warehouseId: createdEvent.warehouseId ?? undefined,
      serviceName: 'reporting-setting-service',
      module: 'notification-delivery',
      action: 'send-test',
      entityType: 'NotificationEvent',
      entityId: createdEvent.id,
      afterData: delivered,
    });

    return delivered;
  }

  private async performDelivery(
    event: any,
    channel: NotificationChannel,
    dto: DeliverNotificationDto,
  ): Promise<{
    status: NotificationDeliveryStatus;
    errorMessage?: string;
    response?: unknown;
  }> {
    if (dto.dryRun) {
      return {
        status: NotificationDeliveryStatus.SKIPPED,
        errorMessage: 'dryRun',
      };
    }

    if (channel === NotificationChannel.EMAIL) {
      const recipientEmail =
        dto.recipientEmail ?? this.readRecipientEmailFromPayload(event.payload);
      if (!recipientEmail) {
        throw new BadRequestException(
          'EMAIL delivery requires recipientEmail if no safe email exists in payload',
        );
      }
      const renderContext = this.notificationTemplateRendererService.buildContextFromNotificationEvent(event);
      const rendered = await this.notificationTemplateRendererService.renderByEventType(
        event.type,
        channel,
        'vi',
        renderContext,
      );
      return this.notificationEmailService.sendEmail(event, recipientEmail, {
        subject: rendered.subject || event.title,
        message: rendered.message || event.message,
        html: rendered.html || undefined,
      });
    }

    if (channel === NotificationChannel.WEBSOCKET || channel === NotificationChannel.IN_APP) {
      const renderContext = this.notificationTemplateRendererService.buildContextFromNotificationEvent(event);
      const rendered = await this.notificationTemplateRendererService.renderByEventType(
        event.type,
        channel,
        'vi',
        renderContext,
      );
      this.notificationWebsocketService.emitNotificationEvent({
        ...event,
        title: rendered.title || event.title,
        message: rendered.message || event.message,
        payload: {
          ...(event.payload && typeof event.payload === 'object' ? event.payload : {}),
          renderedSubject: rendered.subject,
          renderedTitle: rendered.title,
          renderedMessage: rendered.message,
          renderedHtml: rendered.html,
        },
      });
      return {
        status: NotificationDeliveryStatus.DELIVERED,
        response: { mode: 'websocket', rendered },
      };
    }

    throw new BadRequestException('unsupported channel');
  }

  private async updateNotificationEventAfterDelivery(
    notificationEventId: string,
    attempts: Array<{ status: NotificationDeliveryStatus }>,
  ) {
    const hasSuccess = attempts.some(
      (a) =>
        a.status === NotificationDeliveryStatus.SENT ||
        a.status === NotificationDeliveryStatus.DELIVERED,
    );
    if (hasSuccess) {
      await this.prisma.notificationEvent.update({
        where: { id: notificationEventId },
        data: {
          status: NotificationEventStatus.DELIVERED,
          deliveredAt: new Date(),
        },
      });
      const event = await this.notificationEventsService.findOne(notificationEventId);
      this.notificationWebsocketService.emitDelivered(event as any);
    }
  }

  private readRecipientEmailFromPayload(payload: unknown): string | undefined {
    if (!payload || typeof payload !== 'object') return undefined;
    const val = (payload as Record<string, unknown>).recipientEmail;
    return typeof val === 'string' ? val : undefined;
  }

  private summarizeAttempts(requested: number, attempts: Array<{ status: NotificationDeliveryStatus }>) {
    return {
      requested,
      sent: attempts.filter((a) => a.status === NotificationDeliveryStatus.SENT).length,
      delivered: attempts.filter((a) => a.status === NotificationDeliveryStatus.DELIVERED).length,
      failed: attempts.filter((a) => a.status === NotificationDeliveryStatus.FAILED).length,
      skipped: attempts.filter((a) => a.status === NotificationDeliveryStatus.SKIPPED).length,
    };
  }
}
