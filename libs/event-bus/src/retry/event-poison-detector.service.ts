import { Injectable } from '@nestjs/common';
import { EventFailureType } from './event-failure.types';

@Injectable()
export class EventPoisonDetectorService {
  isPoison(input: {
    attempts: number;
    maxAttempts: number;
    sameFingerprintCount: number;
    failureType: EventFailureType;
    deliveryCount?: number;
  }): boolean {
    const enabled =
      `${process.env.EVENT_POISON_DETECTION_ENABLED ?? 'true'}`.toLowerCase() ===
      'true';
    if (!enabled) return false;
    const maxSame = Number.parseInt(
      process.env.EVENT_POISON_MAX_SAME_ERROR ?? '3',
      10,
    );
    if (
      input.failureType === EventFailureType.SCHEMA_ERROR ||
      input.failureType === EventFailureType.VALIDATION_ERROR
    )
      return true;
    if (input.sameFingerprintCount >= maxSame) return true;
    if (
      input.deliveryCount &&
      input.deliveryCount >=
        Number.parseInt(process.env.RABBITMQ_QUORUM_DELIVERY_LIMIT ?? '20', 10)
    )
      return true;
    return input.attempts >= input.maxAttempts;
  }
}
