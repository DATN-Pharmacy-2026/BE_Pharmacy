import { Injectable } from '@nestjs/common';
import { EventEnvelope } from '@app/event-contracts';
import {
  EventFailureClassification,
  EventFailureType,
} from './event-failure.types';
import { buildErrorFingerprint } from './error-fingerprint.util';

@Injectable()
export class EventErrorClassifierService {
  classify(
    error: unknown,
    envelope: EventEnvelope,
    handlerName: string,
  ): EventFailureClassification {
    const err = error as { message?: string; name?: string; code?: string };
    const message = `${err?.message ?? 'Unknown error'}`;
    const code = `${err?.code ?? err?.name ?? 'UNKNOWN'}`.toUpperCase();
    const lowered = message.toLowerCase();

    let failureType = EventFailureType.UNKNOWN;
    let retryable = false;
    if (lowered.includes('validation') || lowered.includes('required')) {
      failureType = EventFailureType.VALIDATION_ERROR;
    } else if (lowered.includes('schema') || lowered.includes('parse')) {
      failureType = EventFailureType.SCHEMA_ERROR;
    } else if (lowered.includes('timeout')) {
      failureType = EventFailureType.TIMEOUT;
      retryable = true;
    } else if (lowered.includes('duplicate') || code.includes('P2002')) {
      failureType = EventFailureType.DUPLICATE;
    } else if (lowered.includes('connection') || lowered.includes('temporar')) {
      failureType = EventFailureType.INFRASTRUCTURE_ERROR;
      retryable = true;
    } else {
      failureType = EventFailureType.HANDLER_ERROR;
      retryable = true;
    }

    const fingerprint = buildErrorFingerprint([
      envelope.eventType,
      envelope.eventVersion.toString(),
      handlerName,
      failureType,
      code,
      message.slice(0, 200),
    ]);

    return {
      failureType,
      retryable,
      errorCode: code,
      safeErrorMessage: message.slice(0, 500),
      errorFingerprint: fingerprint,
      poisonCandidate:
        failureType === EventFailureType.SCHEMA_ERROR ||
        failureType === EventFailureType.VALIDATION_ERROR,
    };
  }
}
