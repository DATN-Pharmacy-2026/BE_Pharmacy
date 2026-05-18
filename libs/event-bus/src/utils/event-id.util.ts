import { randomUUID } from 'crypto';

export function createEventId() {
  return randomUUID();
}
