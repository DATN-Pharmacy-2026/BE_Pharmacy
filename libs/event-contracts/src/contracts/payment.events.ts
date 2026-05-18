export interface PaymentGatewayInitiatedPayload {
  paymentId?: string | null;
  orderId?: string | null;
  transactionId: string;
  provider: string;
  providerOrderId: string;
  requestId: string;
  amount: number;
  currency: string;
  branchId?: string | null;
  warehouseId?: string | null;
  customerUserId?: string | null;
}

export interface PaymentGatewayPaidPayload extends PaymentGatewayInitiatedPayload {
  providerTransactionId?: string | null;
  paidAt: string;
}

export interface PaymentGatewayFailedPayload {
  paymentId?: string | null;
  orderId?: string | null;
  transactionId: string;
  provider: string;
  providerOrderId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  failedAt: string;
  branchId?: string | null;
  warehouseId?: string | null;
  customerUserId?: string | null;
}
