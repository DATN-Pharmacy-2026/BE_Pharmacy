import { Injectable } from '@nestjs/common';
import { EventEnvelope } from '@app/event-contracts';

@Injectable()
export class EventRetrySchedulerService {
  buildRetryHeaders(
    event: EventEnvelope,
    attempt: number,
    maxAttempts: number,
    delayMs: number,
    extras: Record<string, unknown> = {},
  ) {
    return {
      'x-event-id': event.eventId,
      'x-event-type': event.eventType,
      'x-event-version': event.eventVersion,
      'x-correlation-id': event.correlationId,
      'x-causation-id': event.causationId ?? '',
      'x-source-service': event.sourceService,
      'x-idempotency-key': event.idempotencyKey,
      'x-retry-attempt': attempt,
      'x-max-attempts': maxAttempts,
      'x-retry-delay-ms': delayMs,
      ...extras,
    };
  }
}
