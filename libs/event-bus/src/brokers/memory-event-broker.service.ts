import { Injectable, Logger } from '@nestjs/common';
import { EventEnvelope } from '@app/event-contracts';
import { EventBroker } from '../event-broker.interface';

@Injectable()
export class MemoryEventBrokerService implements EventBroker {
  private readonly logger = new Logger(MemoryEventBrokerService.name);
  async publish<T>(event: EventEnvelope<T>): Promise<void> {
    this.logger.warn(`memory broker publish ${event.eventType} ${event.eventId}`);
  }
}
