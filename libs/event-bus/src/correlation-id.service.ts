import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class CorrelationIdService {
  resolve(input?: string | null) {
    return input && input.trim().length > 0 ? input : randomUUID();
  }
}
