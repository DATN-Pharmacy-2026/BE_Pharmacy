import { EventFailureType } from './event-failure.types';

export interface RetryPolicyInput {
  eventType: string;
  sourceService?: string;
  consumerService?: string;
  consumerName?: string;
  failureType: EventFailureType;
  errorCode?: string;
  attempt: number;
  headers?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}

export interface RetryPolicyResult {
  retryable: boolean;
  maxAttempts: number;
  nextDelayMs: number;
  routeToDlq: boolean;
  markPoison: boolean;
  reason: string;
}
