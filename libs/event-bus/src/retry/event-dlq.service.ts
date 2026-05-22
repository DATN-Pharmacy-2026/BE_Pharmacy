import { Injectable } from '@nestjs/common';
import { EventEnvelope } from '@app/event-contracts';

@Injectable()
export class EventDlqService {
  buildDlqPayload(input: {
    originalEnvelope: EventEnvelope;
    failure: Record<string, unknown>;
    broker: Record<string, unknown>;
  }) {
    return {
      originalEnvelope: input.originalEnvelope,
      failure: input.failure,
      broker: input.broker,
    };
  }
}
