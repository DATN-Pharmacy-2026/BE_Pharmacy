export interface EventFailureSummaryContract {
  totalFailures: number;
  retryPending: number;
  dlq: number;
  poison: number;
  resolved: number;
  ignored: number;
  byEventType: Array<{ eventType: string; count: number }>;
  byFailureType: Array<{ failureType: string; count: number }>;
  oldestUnresolvedAt: string | null;
}
