import { Injectable } from '@nestjs/common';
import { EventEnvelope } from '@app/event-contracts';
import { EventHandler } from './event-handler.interface';

@Injectable()
export class EventSubscriberService {
  private handlers: EventHandler[] = [];

  register(handler: EventHandler) {
    this.handlers.push(handler);
  }

  async dispatch(event: EventEnvelope) {
    const matched = this.handlers.filter((h) =>
      h.eventTypes.includes(event.eventType),
    );
    for (const handler of matched) {
      await handler.handle(event);
    }
    return { handledBy: matched.map((h) => h.consumerName) };
  }
}
