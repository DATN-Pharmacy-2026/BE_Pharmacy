import { Injectable } from '@nestjs/common';

@Injectable()
export class MemoryRetryDlqService {
  public retryQueue: Array<Record<string, unknown>> = [];
  public dlqQueue: Array<Record<string, unknown>> = [];

  pushRetry(payload: Record<string, unknown>) {
    this.retryQueue.push(payload);
  }

  pushDlq(payload: Record<string, unknown>) {
    this.dlqQueue.push(payload);
  }
}
