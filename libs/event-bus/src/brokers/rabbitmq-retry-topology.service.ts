import { Injectable } from '@nestjs/common';
import { connect } from 'amqplib';
import { parseBackoffDelays } from '../retry/retry-backoff.util';

@Injectable()
export class RabbitmqRetryTopologyService {
  async ensureTopology(serviceQueueName: string, routingKey: string): Promise<void> {
    const url = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
    const mainExchange = process.env.RABBITMQ_MAIN_EXCHANGE ?? 'pharmacy.events';
    const retryExchange = process.env.RABBITMQ_RETRY_EXCHANGE ?? 'pharmacy.events.retry';
    const dlxExchange = process.env.RABBITMQ_DLX_EXCHANGE ?? 'pharmacy.events.dlx';
    const queueType = process.env.RABBITMQ_QUEUE_TYPE ?? 'quorum';
    const delays = parseBackoffDelays(process.env.EVENT_RETRY_BACKOFF_MS);
    const conn = await connect(url);
    const ch = await conn.createChannel();
    await ch.assertExchange(mainExchange, 'topic', { durable: true });
    await ch.assertExchange(retryExchange, 'topic', { durable: true });
    await ch.assertExchange(dlxExchange, 'topic', { durable: true });
    await ch.assertQueue(serviceQueueName, { durable: true, arguments: { 'x-queue-type': queueType } });
    await ch.bindQueue(serviceQueueName, mainExchange, routingKey);
    for (let i = 0; i < delays.length; i += 1) {
      const retryQueue = `${serviceQueueName}.retry.${i + 1}`;
      const retryKey = `${routingKey}.retry.${i + 1}`;
      await ch.assertQueue(retryQueue, {
        durable: true,
        arguments: {
          'x-message-ttl': delays[i],
          'x-dead-letter-exchange': mainExchange,
          'x-dead-letter-routing-key': routingKey,
          'x-queue-type': queueType,
        },
      });
      await ch.bindQueue(retryQueue, retryExchange, retryKey);
    }
    const dlqQueue = `${serviceQueueName}.dlq`;
    await ch.assertQueue(dlqQueue, { durable: true, arguments: { 'x-queue-type': queueType } });
    await ch.bindQueue(dlqQueue, dlxExchange, routingKey);
    await ch.close();
    await conn.close();
  }
}
