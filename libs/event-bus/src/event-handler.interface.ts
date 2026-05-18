import { EventEnvelope } from '@app/event-contracts';

export interface EventHandler<TPayload = any> {
  eventTypes: string[];
  consumerName: string;
  handle(event: EventEnvelope<TPayload>): Promise<void>;
}
