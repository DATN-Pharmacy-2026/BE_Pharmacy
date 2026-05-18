import { Injectable } from '@nestjs/common';
import { PaymentGatewayProvider, PaymentGatewayTransactionStatus } from '.prisma/client/commerce';
import { PaymentGatewaySignatureService } from '../payment-gateway-signature.service';
import { CreateGatewayPaymentInput, CreateGatewayPaymentResult, GatewayVerificationResult, PaymentGatewayAdapter } from './payment-gateway-adapter.interface';

@Injectable()
export class MomoPaymentAdapter implements PaymentGatewayAdapter {
  provider = PaymentGatewayProvider.MOMO;
  constructor(private readonly signature: PaymentGatewaySignatureService) {}

  async createPayment(input: CreateGatewayPaymentInput): Promise<CreateGatewayPaymentResult> {
    const endpoint = process.env.MOMO_ENDPOINT ?? '';
    const partnerCode = process.env.MOMO_PARTNER_CODE ?? '';
    const accessKey = process.env.MOMO_ACCESS_KEY ?? '';
    const secretKey = process.env.MOMO_SECRET_KEY ?? '';
    const requestId = input.requestId;
    const orderId = input.providerOrderId;
    const raw = `accessKey=${accessKey}&amount=${Math.round(input.amount)}&extraData=&ipnUrl=${input.ipnUrl}&orderId=${orderId}&orderInfo=${input.orderInfo ?? orderId}&partnerCode=${partnerCode}&redirectUrl=${input.returnUrl}&requestId=${requestId}&requestType=${process.env.MOMO_REQUEST_TYPE ?? 'captureWallet'}`;
    const signature = this.signature.hmacSha256(raw, secretKey);
    const paymentUrl = `${endpoint}?orderId=${encodeURIComponent(orderId)}&requestId=${encodeURIComponent(requestId)}`;
    return { provider: this.provider, providerOrderId: orderId, requestId, paymentUrl, rawRequest: { raw, signature }, rawResponse: { mocked: true } };
  }

  verifyReturnPayload(payload: Record<string, any>): GatewayVerificationResult {
    return this.verify(payload);
  }
  verifyCallbackPayload(payload: Record<string, any>): GatewayVerificationResult {
    return this.verify(payload);
  }
  mapProviderStatus(payload: Record<string, any>): PaymentGatewayTransactionStatus {
    return `${payload.resultCode ?? ''}` === '0' ? PaymentGatewayTransactionStatus.PAID : PaymentGatewayTransactionStatus.FAILED;
  }

  private verify(payload: Record<string, any>): GatewayVerificationResult {
    const secretKey = process.env.MOMO_SECRET_KEY ?? '';
    const raw = `accessKey=${process.env.MOMO_ACCESS_KEY ?? ''}&amount=${payload.amount ?? ''}&extraData=${payload.extraData ?? ''}&message=${payload.message ?? ''}&orderId=${payload.orderId ?? ''}&orderInfo=${payload.orderInfo ?? ''}&orderType=${payload.orderType ?? ''}&partnerCode=${payload.partnerCode ?? ''}&payType=${payload.payType ?? ''}&requestId=${payload.requestId ?? ''}&responseTime=${payload.responseTime ?? ''}&resultCode=${payload.resultCode ?? ''}&transId=${payload.transId ?? ''}`;
    const expected = this.signature.hmacSha256(raw, secretKey);
    const provided = payload.signature ? String(payload.signature) : '';
    const valid = provided ? this.signature.equalsSafe(expected, provided) : false;
    return {
      valid,
      provider: this.provider,
      providerOrderId: payload.orderId ?? null,
      requestId: payload.requestId ?? null,
      providerTransactionId: payload.transId ? String(payload.transId) : null,
      amount: payload.amount ? Number(payload.amount) : null,
      status: this.mapProviderStatus(payload),
      rawPayload: payload,
      errorCode: payload.resultCode ? String(payload.resultCode) : null,
      errorMessage: valid ? null : 'invalid signature',
    };
  }
}
