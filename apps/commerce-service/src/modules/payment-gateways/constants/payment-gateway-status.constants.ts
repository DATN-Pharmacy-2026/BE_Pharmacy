import { PaymentGatewayTransactionStatus } from '.prisma/client/commerce';

export const SUCCESS_STATUSES = new Set<PaymentGatewayTransactionStatus>([
  PaymentGatewayTransactionStatus.PAID,
]);

export const TERMINAL_STATUSES = new Set<PaymentGatewayTransactionStatus>([
  PaymentGatewayTransactionStatus.PAID,
  PaymentGatewayTransactionStatus.FAILED,
  PaymentGatewayTransactionStatus.CANCELED,
  PaymentGatewayTransactionStatus.EXPIRED,
  PaymentGatewayTransactionStatus.REFUNDED,
]);
