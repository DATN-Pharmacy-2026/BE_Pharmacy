import { Injectable } from '@nestjs/common';

@Injectable()
export class EventFailureVisibilityService {
  sanitizePayloadPreview(payload: unknown, maxChars: number) {
    const raw = JSON.stringify(payload ?? {});
    if (raw.length <= maxChars) {
      return { preview: raw, truncated: false };
    }
    return { preview: `${raw.slice(0, maxChars)}...`, truncated: true };
  }
}
