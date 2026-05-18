import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class PaymentGatewaySignatureService {
  hmacSha512(data: string, secret: string) {
    return createHmac('sha512', secret).update(data).digest('hex');
  }

  hmacSha256(data: string, secret: string) {
    return createHmac('sha256', secret).update(data).digest('hex');
  }

  equalsSafe(a?: string | null, b?: string | null) {
    if (!a || !b) return false;
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
  }
}
