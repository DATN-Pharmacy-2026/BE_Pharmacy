import { Injectable, Logger } from '@nestjs/common';
import { connect } from 'amqplib';
import { EventEnvelope } from '@app/event-contracts';
import { EventBroker } from '../event-broker.interface';

@Injectable()
export class RabbitmqEventBrokerService implements EventBroker {
  private readonly logger = new Logger(RabbitmqEventBrokerService.name);

  async publish<T>(event: EventEnvelope<T>): Promise<void> {
    const url = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
    const exchange = process.env.RABBITMQ_EXCHANGE ?? 'pharmacy.events';
    const exchangeType = process.env.RABBITMQ_EXCHANGE_TYPE ?? 'topic';
    const conn = await connect(url);
    const ch = await conn.createChannel();
    await ch.assertExchange(exchange, exchangeType, { durable: true });
    const content = Buffer.from(JSON.stringify(event));
    ch.publish(exchange, event.eventType, content, {
      persistent:
        `${process.env.RABBITMQ_MESSAGE_PERSISTENT ?? 'true'}`.toLowerCase() ===
        'true',
      headers: {
        'x-event-id': event.eventId,
        'x-event-type': event.eventType,
        'x-event-version': event.eventVersion,
        'x-correlation-id': event.correlationId,
        'x-causation-id': event.causationId ?? '',
        'x-source-service': event.sourceService,
        'x-idempotency-key': event.idempotencyKey,
      },
    });
    await ch.close();
    await conn.close();
    this.logger.log(`published ${event.eventType} ${event.eventId}`);
  }
}
