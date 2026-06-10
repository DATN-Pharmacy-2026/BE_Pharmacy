import { Injectable } from '@nestjs/common';
import { EventFailureType } from './event-failure.types';
import { RetryPolicyInput, RetryPolicyResult } from './retry-policy.types';
import { parseBackoffDelays, withJitter } from './retry-backoff.util';

@Injectable()
export class EventRetryPolicyService {
  evaluate(input: RetryPolicyInput): RetryPolicyResult {
    const enabled =
      `${process.env.EVENT_RETRY_ENABLED ?? 'true'}`.toLowerCase() === 'true';
    const maxAttempts = Number.parseInt(
      process.env.EVENT_RETRY_MAX_ATTEMPTS ?? '4',
      10,
    );
    const delays = parseBackoffDelays(process.env.EVENT_RETRY_BACKOFF_MS);
    const jitterEnabled =
      `${process.env.EVENT_RETRY_JITTER_ENABLED ?? 'true'}`.toLowerCase() ===
      'true';
    const jitterRatio = Number.parseFloat(
      process.env.EVENT_RETRY_JITTER_RATIO ?? '0.2',
    );

    if (!enabled) {
      return {
        retryable: false,
        maxAttempts,
        nextDelayMs: 0,
        routeToDlq: true,
        markPoison: false,
        reason: 'Retry disabled',
      };
    }

    const nonRetryable = new Set<EventFailureType>([
      EventFailureType.SCHEMA_ERROR,
      EventFailureType.VALIDATION_ERROR,
      EventFailureType.BUSINESS_RULE_ERROR,
      EventFailureType.DUPLICATE,
      EventFailureType.UNKNOWN_HANDLER,
      EventFailureType.POISON_MESSAGE,
    ]);
    const retryable = !nonRetryable.has(input.failureType);
    const attempt = Math.max(1, input.attempt);
    const exceeded = attempt >= maxAttempts;
    const baseDelay =
      delays[Math.min(attempt - 1, delays.length - 1)] ??
      delays[delays.length - 1] ??
      0;
    const delay = withJitter(baseDelay, jitterEnabled, jitterRatio);
    return {
      retryable,
      maxAttempts,
      nextDelayMs: delay,
      routeToDlq: !retryable || exceeded,
      markPoison: input.failureType === EventFailureType.POISON_MESSAGE,
      reason: !retryable
        ? 'Non-retryable failure'
        : exceeded
          ? 'Retry attempts exhausted'
          : 'Retry scheduled',
    };
  }
}
