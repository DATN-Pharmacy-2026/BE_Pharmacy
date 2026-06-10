import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EventErrorClassifierService,
  EventFailureStatus,
  EventFailureType,
  EventFailureVisibilityService,
  EventPublisherService,
  EventReplayService,
  EventRetryPolicyService,
} from '@app/event-bus';
import { EVENT_TYPES, EventEnvelope } from '@app/event-contracts';
import {
  NotificationChannel,
  NotificationEventStatus,
  NotificationSeverity,
  NotificationEventType,
  Prisma,
} from '.prisma/client/reporting';
import { randomUUID } from 'crypto';
import { ReportingPrismaService } from '../../prisma/reporting-prisma.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: ReportingPrismaService,
    private readonly publisher: EventPublisherService,
    private readonly classifier: EventErrorClassifierService,
    private readonly retryPolicy: EventRetryPolicyService,
    private readonly replayService: EventReplayService,
    private readonly visibility: EventFailureVisibilityService,
  ) {}

  health() {
    return {
      brokerEnabled:
        `${process.env.EVENT_BROKER_ENABLED ?? 'true'}`.toLowerCase() ===
        'true',
      brokerType: process.env.BROKER_TYPE ?? 'rabbitmq',
    };
  }

  async listOutbox(page: number, limit: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.eventOutbox.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.eventOutbox.count(),
    ]);
    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async listInbox(page: number, limit: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.eventInbox.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.eventInbox.count(),
    ]);
    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async publishOutbox(id: string) {
    const outbox = await this.prisma.eventOutbox.findUnique({ where: { id } });
    if (!outbox) throw new NotFoundException('outbox event not found');
    const envelope = outbox.payload as unknown as EventEnvelope<
      Record<string, unknown>
    >;
    await this.publisher.publish(envelope);
    await this.prisma.eventOutbox.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    return { published: true, eventId: outbox.eventId };
  }

  async publishTest(body: {
    eventType: string;
    aggregateId: string;
    payload: Record<string, unknown>;
  }) {
    if (
      `${process.env.EVENT_TEST_ENDPOINT_ENABLED ?? 'false'}`.toLowerCase() !==
      'true'
    ) {
      throw new BadRequestException('publish-test disabled');
    }
    const envelope = this.publisher.buildEnvelope({
      eventId: randomUUID(),
      eventType: body.eventType,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      sourceService: 'reporting-setting-service',
      sourceModule: 'events',
      aggregateType: 'test',
      aggregateId: body.aggregateId,
      correlationId: randomUUID(),
      causationId: null,
      idempotencyKey: `${body.eventType}:${body.aggregateId}`,
      actorUserId: null,
      branchId: null,
      warehouseId: null,
      tenantId: null,
      payload: body.payload,
      metadata: null,
    });
    await this.publisher.publish(envelope);
    return { published: true, envelope };
  }

  async processIncomingEvent(
    envelope: EventEnvelope<Record<string, unknown>>,
    consumerName: string,
  ) {
    const existing = await this.prisma.eventInbox.findFirst({
      where: {
        eventId: envelope.eventId,
        consumerService: 'reporting-setting-service',
        consumerName,
      },
    });
    if (existing?.status === 'PROCESSED')
      return { skipped: true, reason: 'duplicate' };

    const inbox =
      existing ??
      (await this.prisma.eventInbox.create({
        data: {
          eventId: envelope.eventId,
          eventType: envelope.eventType,
          eventVersion: envelope.eventVersion,
          sourceService: envelope.sourceService,
          consumerService: 'reporting-setting-service',
          consumerName,
          aggregateType: envelope.aggregateType,
          aggregateId: envelope.aggregateId,
          correlationId: envelope.correlationId,
          causationId: envelope.causationId ?? null,
          idempotencyKey: envelope.idempotencyKey,
          payload: envelope.payload as Prisma.InputJsonValue,
          status: 'PROCESSING',
        },
      }));

    try {
      if (
        envelope.eventType === EVENT_TYPES.COMMERCE_PAYMENT_GATEWAY_PAID ||
        envelope.eventType === EVENT_TYPES.COMMERCE_PAYMENT_GATEWAY_FAILED
      ) {
        if (!envelope.payload.transactionId)
          throw new BadRequestException('missing transactionId');
        await this.prisma.notificationEvent.create({
          data: {
            type: NotificationEventType.PAYMENT_UPDATED,
            channel: NotificationChannel.IN_APP,
            severity:
              envelope.eventType === EVENT_TYPES.COMMERCE_PAYMENT_GATEWAY_PAID
                ? NotificationSeverity.SUCCESS
                : NotificationSeverity.ERROR,
            title:
              envelope.eventType === EVENT_TYPES.COMMERCE_PAYMENT_GATEWAY_PAID
                ? 'Payment updated'
                : 'Payment failed',
            message:
              envelope.eventType === EVENT_TYPES.COMMERCE_PAYMENT_GATEWAY_PAID
                ? 'Payment was verified as paid.'
                : 'Payment failed verification.',
            recipientUserId:
              (envelope.payload.customerUserId as string | undefined) ?? null,
            branchId: (envelope.payload.branchId as string | undefined) ?? null,
            warehouseId:
              (envelope.payload.warehouseId as string | undefined) ?? null,
            sourceService: envelope.sourceService,
            sourceModule: 'payment-gateway',
            sourceEntityType: 'PaymentGatewayTransaction',
            sourceEntityId:
              (envelope.payload.transactionId as string | undefined) ?? null,
            payload: envelope.payload as Prisma.InputJsonValue,
            status: NotificationEventStatus.PENDING,
          },
        });
      }

      await this.prisma.eventInbox.update({
        where: { id: inbox.id },
        data: { status: 'PROCESSED', processedAt: new Date() },
      });
      return { processed: true, inboxId: inbox.id };
    } catch (error) {
      const classification = this.classifier.classify(
        error,
        envelope,
        consumerName,
      );
      const attempts = (inbox.attempts ?? 0) + 1;
      const policy = this.retryPolicy.evaluate({
        eventType: envelope.eventType,
        sourceService: envelope.sourceService,
        consumerService: 'reporting-setting-service',
        consumerName,
        failureType: classification.failureType,
        errorCode: classification.errorCode,
        attempt: attempts,
      });

      await this.prisma.eventInbox.update({
        where: { id: inbox.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          attempts,
          lastError: classification.safeErrorMessage,
        },
      });

      const failure = await (this.prisma as any).eventFailure.upsert({
        where: {
          eventId_consumerService_consumerName: {
            eventId: envelope.eventId,
            consumerService: 'reporting-setting-service',
            consumerName,
          },
        },
        update: {
          attempts,
          retryable: policy.retryable,
          status: policy.routeToDlq
            ? classification.poisonCandidate
              ? EventFailureStatus.POISON
              : EventFailureStatus.DLQ
            : EventFailureStatus.RETRY_PENDING,
          failureType: classification.failureType,
          poison: classification.poisonCandidate,
          lastErrorCode: classification.errorCode,
          lastErrorMessage: classification.safeErrorMessage,
          errorFingerprint: classification.errorFingerprint,
          lastAttemptAt: new Date(),
          nextRetryAt: policy.routeToDlq
            ? null
            : new Date(Date.now() + policy.nextDelayMs),
        },
        create: {
          eventId: envelope.eventId,
          eventType: envelope.eventType,
          eventVersion: envelope.eventVersion,
          sourceService: envelope.sourceService,
          consumerService: 'reporting-setting-service',
          consumerName,
          aggregateType: envelope.aggregateType,
          aggregateId: envelope.aggregateId,
          correlationId: envelope.correlationId,
          causationId: envelope.causationId,
          idempotencyKey: envelope.idempotencyKey,
          branchId: envelope.branchId,
          warehouseId: envelope.warehouseId,
          actorUserId: envelope.actorUserId,
          payload: envelope.payload as Prisma.InputJsonValue,
          headers: {} as Prisma.InputJsonValue,
          status: policy.routeToDlq
            ? classification.poisonCandidate
              ? EventFailureStatus.POISON
              : EventFailureStatus.DLQ
            : EventFailureStatus.RETRY_PENDING,
          failureType: classification.failureType,
          retryable: policy.retryable,
          poison: classification.poisonCandidate,
          attempts,
          maxAttempts: policy.maxAttempts,
          nextRetryAt: policy.routeToDlq
            ? null
            : new Date(Date.now() + policy.nextDelayMs),
          lastAttemptAt: new Date(),
          lastErrorCode: classification.errorCode,
          lastErrorMessage: classification.safeErrorMessage,
          errorFingerprint: classification.errorFingerprint,
          brokerName: process.env.BROKER_TYPE ?? 'rabbitmq',
        },
      });

      if (!policy.routeToDlq && policy.retryable) {
        await this.publisher.publish(envelope);
      }

      return {
        processed: false,
        retryable: policy.retryable,
        status: failure.status,
      };
    }
  }

  async listFailures(page: number, limit: number) {
    const [items, total] = await this.prisma.$transaction([
      (this.prisma as any).eventFailure.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { failedAt: 'desc' },
      }),
      (this.prisma as any).eventFailure.count(),
    ]);
    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async failuresSummary() {
    const [totalFailures, retryPending, dlq, poison, resolved, ignored] =
      await Promise.all([
        (this.prisma as any).eventFailure.count(),
        (this.prisma as any).eventFailure.count({
          where: { status: EventFailureStatus.RETRY_PENDING },
        }),
        (this.prisma as any).eventFailure.count({
          where: { status: EventFailureStatus.DLQ },
        }),
        (this.prisma as any).eventFailure.count({ where: { poison: true } }),
        (this.prisma as any).eventFailure.count({
          where: { status: EventFailureStatus.RESOLVED },
        }),
        (this.prisma as any).eventFailure.count({
          where: { status: EventFailureStatus.IGNORED },
        }),
      ]);
    return {
      totalFailures,
      retryPending,
      dlq,
      poison,
      resolved,
      ignored,
      byEventType: [],
      byFailureType: [],
      oldestUnresolvedAt: null,
    };
  }

  async failureDetail(id: string) {
    const failure = await (this.prisma as any).eventFailure.findUnique({
      where: { id },
    });
    if (!failure) throw new NotFoundException('failure not found');
    return failure;
  }

  async payloadPreview(id: string) {
    const failure = await this.failureDetail(id);
    const maxChars = Number.parseInt(
      process.env.EVENT_DLQ_PAYLOAD_PREVIEW_MAX_CHARS ?? '4000',
      10,
    );
    return this.visibility.sanitizePayloadPreview(failure.payload, maxChars);
  }

  async replayFailure(
    id: string,
    body: {
      mode:
        | 'REPLAY_ORIGINAL'
        | 'REPLAY_AS_NEW_EVENT'
        | 'MARK_RESOLVED'
        | 'IGNORE';
      reason: string;
      dryRun?: boolean;
    },
  ) {
    const failure = await this.failureDetail(id);
    if (!body.reason) throw new BadRequestException('reason required');
    if (body.mode === 'MARK_RESOLVED')
      return this.resolveFailure(id, body.reason);
    if (body.mode === 'IGNORE') return this.ignoreFailure(id, body.reason);

    const originalEnvelope = this.publisher.buildEnvelope({
      eventId: failure.eventId,
      eventType: failure.eventType,
      eventVersion: failure.eventVersion,
      occurredAt: failure.failedAt.toISOString(),
      sourceService: failure.sourceService,
      sourceModule: 'replay',
      aggregateType: failure.aggregateType ?? 'unknown',
      aggregateId: failure.aggregateId ?? 'unknown',
      correlationId: failure.correlationId ?? randomUUID(),
      causationId: failure.causationId,
      idempotencyKey:
        failure.idempotencyKey ?? `${failure.eventType}:${failure.eventId}`,
      actorUserId: failure.actorUserId,
      branchId: failure.branchId,
      warehouseId: failure.warehouseId,
      tenantId: null,
      payload: (failure.payload ?? {}) as Record<string, unknown>,
      metadata: null,
    });
    const replayEnvelope = this.replayService.buildReplayEnvelope(
      originalEnvelope,
      body.mode,
    );
    if (!body.dryRun) {
      await this.publisher.publish(replayEnvelope);
      await (this.prisma as any).eventFailure.update({
        where: { id },
        data: {
          status: EventFailureStatus.REPLAYED,
          replayedAt: new Date(),
          replayCount: { increment: 1 },
        },
      });
    }

    const replayAudit = await (this.prisma as any).eventReplayAudit.create({
      data: {
        eventFailureId: id,
        eventId: failure.eventId,
        replayEventId:
          body.mode === 'REPLAY_AS_NEW_EVENT' ? replayEnvelope.eventId : null,
        replayMode: body.mode,
        reason: body.reason,
        beforeStatus: failure.status,
        afterStatus: body.dryRun ? failure.status : EventFailureStatus.REPLAYED,
        result: body.dryRun ? 'DRY_RUN' : 'PUBLISHED',
      },
    });

    return {
      failure,
      replayAudit,
      replayEnvelope,
      warnings: body.dryRun ? ['Dry run mode, nothing published'] : [],
    };
  }

  async resolveFailure(id: string, reason?: string) {
    const failure = await this.failureDetail(id);
    const updated = await (this.prisma as any).eventFailure.update({
      where: { id },
      data: { status: EventFailureStatus.RESOLVED, resolvedAt: new Date() },
    });
    const replayAudit = await (this.prisma as any).eventReplayAudit.create({
      data: {
        eventFailureId: id,
        eventId: failure.eventId,
        replayMode: 'MARK_RESOLVED',
        reason,
        beforeStatus: failure.status,
        afterStatus: EventFailureStatus.RESOLVED,
        result: 'RESOLVED',
      },
    });
    return { failure: updated, replayAudit };
  }

  async ignoreFailure(id: string, reason?: string) {
    const failure = await this.failureDetail(id);
    const updated = await (this.prisma as any).eventFailure.update({
      where: { id },
      data: { status: EventFailureStatus.IGNORED },
    });
    const replayAudit = await (this.prisma as any).eventReplayAudit.create({
      data: {
        eventFailureId: id,
        eventId: failure.eventId,
        replayMode: 'IGNORE',
        reason,
        beforeStatus: failure.status,
        afterStatus: EventFailureStatus.IGNORED,
        result: 'IGNORED',
      },
    });
    return { failure: updated, replayAudit };
  }

  listReplayAudits(page: number, limit: number) {
    return (this.prisma as any).eventReplayAudit.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  getRetryPolicy() {
    return {
      enabled:
        `${process.env.EVENT_RETRY_ENABLED ?? 'true'}`.toLowerCase() === 'true',
      strategy: process.env.EVENT_RETRY_STRATEGY ?? 'delay-buckets',
      maxAttempts: Number.parseInt(
        process.env.EVENT_RETRY_MAX_ATTEMPTS ?? '4',
        10,
      ),
      backoff: process.env.EVENT_RETRY_BACKOFF_MS ?? '5000,30000,120000,600000',
    };
  }

  evaluateRetryPolicy(input: {
    eventType: string;
    failureType: EventFailureType;
    attempt: number;
  }) {
    return this.retryPolicy.evaluate({
      eventType: input.eventType,
      failureType: input.failureType,
      attempt: input.attempt,
      consumerService: 'reporting-setting-service',
      consumerName: 'manual-evaluate',
    });
  }
}
