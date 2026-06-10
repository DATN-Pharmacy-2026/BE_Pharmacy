import {
  PaymentGatewayProvider,
  PaymentGatewayTransactionStatus,
} from '.prisma/client/commerce';

export const PAYMENT_GATEWAY_PROVIDERS = Object.values(PaymentGatewayProvider);
export const PAYMENT_GATEWAY_STATUSES = Object.values(
  PaymentGatewayTransactionStatus,
);
export const PAYMENT_GATEWAY_CURRENCY = 'VND';
