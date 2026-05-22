import { Injectable } from '@nestjs/common';
import { EventEnvelope } from '@app/event-contracts';
import { randomUUID } from 'crypto';

export type ReplayMode =
  | 'REPLAY_ORIGINAL'
  | 'REPLAY_AS_NEW_EVENT'
  | 'MARK_RESOLVED'
  | 'IGNORE';

@Injectable()
export class EventReplayService {
  buildReplayEnvelope(
    envelope: EventEnvelope<Record<string, unknown>>,
    mode: ReplayMode,
  ): EventEnvelope<Record<string, unknown>> {
    if (mode === 'REPLAY_AS_NEW_EVENT') {
      return {
        ...envelope,
        eventId: randomUUID(),
        causationId: envelope.eventId,
        metadata: {
          ...(envelope.metadata ?? {}),
          replayOfEventId: envelope.eventId,
        },
      };
    }
    return envelope;
  }
}
