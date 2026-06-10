import { Injectable } from '@nestjs/common';
import { PaymentGatewayProvider } from '.prisma/client/commerce';

@Injectable()
export class PaymentGatewayConfigService {
  isSandbox() {
    return (
      `${process.env.PAYMENT_GATEWAY_SANDBOX ?? 'true'}`.toLowerCase() ===
      'true'
    );
  }

  isGatewayEnabled() {
    return (
      `${process.env.PAYMENT_GATEWAY_ENABLED ?? 'false'}`.toLowerCase() ===
      'true'
    );
  }

  isProviderEnabled(provider: PaymentGatewayProvider) {
    const key = `${provider}_ENABLED`;
    return `${process.env[key] ?? 'false'}`.toLowerCase() === 'true';
  }

  getDefaultCurrency() {
    return process.env.PAYMENT_GATEWAY_DEFAULT_CURRENCY ?? 'VND';
  }
}
