import { EventEnvelope } from '@app/event-contracts';

export interface EventBroker {
  publish<T>(event: EventEnvelope<T>): Promise<void>;
}
