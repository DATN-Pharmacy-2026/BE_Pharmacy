import { Injectable, Logger } from '@nestjs/common';
import { EventEnvelope } from '@app/event-contracts';
import { EventBroker } from '../event-broker.interface';

@Injectable()
export class KafkaEventBrokerService implements EventBroker {
  private readonly logger = new Logger(KafkaEventBrokerService.name);
  async publish<T>(event: EventEnvelope<T>): Promise<void> {
    this.logger.warn(`kafka adapter foundation only: ${event.eventType}`);
  }
}
