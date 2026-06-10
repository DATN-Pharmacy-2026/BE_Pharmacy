import { Injectable } from '@nestjs/common';
import { connect } from 'amqplib';

@Injectable()
export class RabbitmqDlqService {
  async publish(
    routingKey: string,
    payload: Record<string, unknown>,
    headers: Record<string, unknown> = {},
  ) {
    const url = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
    const exchange = process.env.RABBITMQ_DLX_EXCHANGE ?? 'pharmacy.events.dlx';
    const conn = await connect(url);
    const ch = await conn.createChannel();
    await ch.assertExchange(exchange, 'topic', { durable: true });
    ch.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
      headers,
    });
    await ch.close();
    await conn.close();
  }
}
