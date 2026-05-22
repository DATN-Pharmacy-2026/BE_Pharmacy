export type EventMetadata = Record<string, unknown>;

export interface EventEnvelope<TPayload = unknown> {
  eventId: string;
  eventType: string;
  eventVersion: number;
  schemaVersion: string;
  occurredAt: string;
  publishedAt?: string | null;
  sourceService: string;
  sourceModule?: string | null;
  aggregateType: string;
  aggregateId: string;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  actorUserId?: string | null;
  branchId?: string | null;
  warehouseId?: string | null;
  tenantId?: string | null;
  payload: TPayload;
  metadata?: EventMetadata | null;
}
