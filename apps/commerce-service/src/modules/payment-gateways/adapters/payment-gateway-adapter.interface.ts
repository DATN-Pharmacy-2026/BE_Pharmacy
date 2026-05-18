import { PaymentGatewayProvider, PaymentGatewayTransactionStatus } from '.prisma/client/commerce';

export interface CreateGatewayPaymentInput {
  transactionId: string;
  provider: PaymentGatewayProvider;
  amount: number;
  currency: string;
  providerOrderId: string;
  requestId: string;
  orderInfo?: string;
  returnUrl: string;
  ipnUrl: string;
  locale?: string;
  bankCode?: string;
}

export interface CreateGatewayPaymentResult {
  provider: PaymentGatewayProvider;
  providerOrderId: string;
  requestId: string;
  paymentUrl?: string | null;
  qrCodeUrl?: string | null;
  deeplink?: string | null;
  appLink?: string | null;
  rawRequest?: unknown;
  rawResponse?: unknown;
  expiresAt?: Date | null;
}

export interface GatewayVerificationResult {
  valid: boolean;
  provider: PaymentGatewayProvider;
  providerOrderId?: string | null;
  requestId?: string | null;
  providerTransactionId?: string | null;
  amount?: number | null;
  status: PaymentGatewayTransactionStatus;
  rawPayload: unknown;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export interface QueryGatewayTransactionInput {
  providerOrderId: string;
  requestId?: string;
}

export interface QueryGatewayTransactionResult extends GatewayVerificationResult {}

export interface PaymentGatewayAdapter {
  provider: PaymentGatewayProvider;
  createPayment(input: CreateGatewayPaymentInput): Promise<CreateGatewayPaymentResult>;
  verifyReturnPayload(payload: Record<string, any>): Promise<GatewayVerificationResult> | GatewayVerificationResult;
  verifyCallbackPayload(payload: Record<string, any>, headers?: Record<string, any>): Promise<GatewayVerificationResult> | GatewayVerificationResult;
  mapProviderStatus(payload: Record<string, any>): PaymentGatewayTransactionStatus;
  queryTransaction?(input: QueryGatewayTransactionInput): Promise<QueryGatewayTransactionResult>;
  buildProviderOrderId?(input: CreateGatewayPaymentInput): string;
}
