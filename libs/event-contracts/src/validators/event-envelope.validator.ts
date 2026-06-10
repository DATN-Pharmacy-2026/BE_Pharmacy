import { EventEnvelope } from '../event-envelope';

export function validateEventEnvelope(event: Partial<EventEnvelope<unknown>>) {
  return Boolean(
    event.eventId &&
    event.eventType &&
    event.eventVersion &&
    event.occurredAt &&
    event.sourceService &&
    event.aggregateType &&
    event.aggregateId &&
    event.correlationId &&
    event.idempotencyKey,
  );
}
