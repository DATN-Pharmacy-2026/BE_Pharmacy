import { Injectable } from '@nestjs/common';

@Injectable()
export class EventIdempotencyService {
  forPaymentGateway(provider: string, providerOrderId: string, status: string) {
    return `payment-gateway:${provider}:${providerOrderId}:${status}`;
  }
}
