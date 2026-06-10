import { Injectable } from '@nestjs/common';
import { EventEnvelope, EVENT_SCHEMA_VERSION } from '@app/event-contracts';
import { EventBroker } from './event-broker.interface';
import { RabbitmqEventBrokerService } from './brokers/rabbitmq-event-broker.service';
import { MemoryEventBrokerService } from './brokers/memory-event-broker.service';
import { KafkaEventBrokerService } from './brokers/kafka-event-broker.service';

@Injectable()
export class EventPublisherService {
  constructor(
    private readonly rabbit: RabbitmqEventBrokerService,
    private readonly memory: MemoryEventBrokerService,
    private readonly kafka: KafkaEventBrokerService,
  ) {}

  broker(): EventBroker {
    const type = (process.env.BROKER_TYPE ?? 'rabbitmq').toLowerCase();
    if (type === 'memory') return this.memory;
    if (type === 'kafka') return this.kafka;
    return this.rabbit;
  }

  async publish<T>(event: EventEnvelope<T>) {
    await this.broker().publish(event);
  }

  buildEnvelope<T>(
    input: Omit<EventEnvelope<T>, 'schemaVersion' | 'publishedAt'>,
  ): EventEnvelope<T> {
    return { ...input, schemaVersion: EVENT_SCHEMA_VERSION, publishedAt: null };
  }
}
