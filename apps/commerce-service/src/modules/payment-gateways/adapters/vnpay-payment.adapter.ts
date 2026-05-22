import { Injectable } from '@nestjs/common';
import { PaymentGatewayProvider, PaymentGatewayTransactionStatus } from '.prisma/client/commerce';
import { PaymentGatewaySignatureService } from '../payment-gateway-signature.service';
import { CreateGatewayPaymentInput, CreateGatewayPaymentResult, GatewayVerificationResult, PaymentGatewayAdapter } from './payment-gateway-adapter.interface';

@Injectable()
export class VnpayPaymentAdapter implements PaymentGatewayAdapter {
  provider = PaymentGatewayProvider.VNPAY;
  constructor(private readonly signature: PaymentGatewaySignatureService) {}

  async createPayment(input: CreateGatewayPaymentInput): Promise<CreateGatewayPaymentResult> {
    const tmnCode = process.env.VNPAY_TMN_CODE ?? '';
    const secret = process.env.VNPAY_HASH_SECRET ?? '';
    const baseUrl = process.env.VNPAY_PAYMENT_URL ?? '';
    const params = new URLSearchParams({
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: `${Math.round(input.amount * 100)}`,
      vnp_CreateDate: new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14),
      vnp_CurrCode: 'VND',
      vnp_IpAddr: '127.0.0.1',
      vnp_Locale: input.locale ?? (process.env.VNPAY_LOCALE ?? 'vn'),
      vnp_OrderInfo: input.orderInfo ?? `Order ${input.providerOrderId}`,
      vnp_OrderType: process.env.VNPAY_ORDER_TYPE ?? 'other',
      vnp_ReturnUrl: input.returnUrl,
      vnp_TxnRef: input.providerOrderId,
    });
    const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const signData = sorted.map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, '+')}`).join('&');
    const hash = this.signature.hmacSha512(signData, secret);
    params.set('vnp_SecureHash', hash);

    return {
      provider: this.provider,
      providerOrderId: input.providerOrderId,
      requestId: input.requestId,
      paymentUrl: `${baseUrl}?${params.toString()}`,
      rawRequest: Object.fromEntries(params.entries()),
      rawResponse: { mocked: true },
    };
  }

  verifyReturnPayload(payload: Record<string, any>): GatewayVerificationResult {
    return this.verifyPayload(payload);
  }

  verifyCallbackPayload(payload: Record<string, any>): GatewayVerificationResult {
    return this.verifyPayload(payload);
  }

  mapProviderStatus(payload: Record<string, any>): PaymentGatewayTransactionStatus {
    return payload.vnp_ResponseCode === '00' ? PaymentGatewayTransactionStatus.PAID : PaymentGatewayTransactionStatus.FAILED;
  }

  private verifyPayload(payload: Record<string, any>): GatewayVerificationResult {
    const secret = process.env.VNPAY_HASH_SECRET ?? '';
    const providedHash = payload.vnp_SecureHash;
    const cloned = { ...payload };
    delete cloned.vnp_SecureHash;
    delete cloned.vnp_SecureHashType;
    const sorted = Object.entries(cloned).sort(([a], [b]) => a.localeCompare(b));
    const signData = sorted.map(([k, v]) => `${k}=${encodeURIComponent(String(v)).replace(/%20/g, '+')}`).join('&');
    const expected = this.signature.hmacSha512(signData, secret);
    const valid = this.signature.equalsSafe(expected, providedHash);
    return {
      valid,
      provider: this.provider,
      providerOrderId: payload.vnp_TxnRef ?? null,
      requestId: payload.vnp_TransactionNo ?? null,
      providerTransactionId: payload.vnp_TransactionNo ?? null,
      amount: payload.vnp_Amount ? Number(payload.vnp_Amount) / 100 : null,
      status: valid ? this.mapProviderStatus(payload) : PaymentGatewayTransactionStatus.UNKNOWN,
      rawPayload: payload,
      errorCode: payload.vnp_ResponseCode ?? null,
      errorMessage: valid ? null : 'invalid signature',
    };
  }
}
