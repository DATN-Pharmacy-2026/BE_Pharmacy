export enum EventFailureStatus {
  RETRY_PENDING = 'RETRY_PENDING',
  RETRYING = 'RETRYING',
  DLQ = 'DLQ',
  POISON = 'POISON',
  REPLAY_PENDING = 'REPLAY_PENDING',
  REPLAYED = 'REPLAYED',
  RESOLVED = 'RESOLVED',
  IGNORED = 'IGNORED',
  FAILED = 'FAILED',
}

export enum EventFailureType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SCHEMA_ERROR = 'SCHEMA_ERROR',
  BUSINESS_RULE_ERROR = 'BUSINESS_RULE_ERROR',
  TRANSIENT_ERROR = 'TRANSIENT_ERROR',
  INFRASTRUCTURE_ERROR = 'INFRASTRUCTURE_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN_HANDLER = 'UNKNOWN_HANDLER',
  HANDLER_ERROR = 'HANDLER_ERROR',
  DUPLICATE = 'DUPLICATE',
  POISON_MESSAGE = 'POISON_MESSAGE',
  UNKNOWN = 'UNKNOWN',
}

export interface EventFailureClassification {
  failureType: EventFailureType;
  retryable: boolean;
  errorCode: string;
  safeErrorMessage: string;
  errorFingerprint: string;
  poisonCandidate: boolean;
}
