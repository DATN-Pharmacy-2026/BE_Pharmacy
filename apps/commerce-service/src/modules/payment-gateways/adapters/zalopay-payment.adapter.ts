import { Injectable } from '@nestjs/common';
import {
  PaymentGatewayProvider,
  PaymentGatewayTransactionStatus,
} from '.prisma/client/commerce';
import { PaymentGatewaySignatureService } from '../payment-gateway-signature.service';
import {
  CreateGatewayPaymentInput,
  CreateGatewayPaymentResult,
  GatewayVerificationResult,
  PaymentGatewayAdapter,
} from './payment-gateway-adapter.interface';

@Injectable()
export class ZalopayPaymentAdapter implements PaymentGatewayAdapter {
  provider = PaymentGatewayProvider.ZALOPAY;
  constructor(private readonly signature: PaymentGatewaySignatureService) {}

  async createPayment(
    input: CreateGatewayPaymentInput,
  ): Promise<CreateGatewayPaymentResult> {
    const endpoint = process.env.ZALOPAY_ENDPOINT ?? '';
    const appId = process.env.ZALOPAY_APP_ID ?? '';
    const key1 = process.env.ZALOPAY_KEY1 ?? '';
    const appTransId = input.providerOrderId;
    const data = `${appId}|${appTransId}|${Date.now()}|${Math.round(input.amount)}|${input.orderInfo ?? appTransId}|{}|[]`;
    const mac = this.signature.hmacSha256(data, key1);
    const paymentUrl = `${endpoint}?apptransid=${encodeURIComponent(appTransId)}&mac=${mac}`;
    return {
      provider: this.provider,
      providerOrderId: appTransId,
      requestId: input.requestId,
      paymentUrl,
      rawRequest: { data, mac },
      rawResponse: { mocked: true },
    };
  }

  verifyReturnPayload(payload: Record<string, any>): GatewayVerificationResult {
    return this.verify(payload);
  }

  verifyCallbackPayload(
    payload: Record<string, any>,
  ): GatewayVerificationResult {
    return this.verify(payload);
  }

  mapProviderStatus(
    payload: Record<string, any>,
  ): PaymentGatewayTransactionStatus {
    return `${payload.status ?? payload.return_code ?? ''}` === '1'
      ? PaymentGatewayTransactionStatus.PAID
      : PaymentGatewayTransactionStatus.FAILED;
  }

  private verify(payload: Record<string, any>): GatewayVerificationResult {
    const key2 = process.env.ZALOPAY_KEY2 ?? '';
    const data = payload.data ? String(payload.data) : JSON.stringify(payload);
    const expected = this.signature.hmacSha256(data, key2);
    const provided = payload.mac ? String(payload.mac) : '';
    const valid = provided
      ? this.signature.equalsSafe(expected, provided)
      : false;
    return {
      valid,
      provider: this.provider,
      providerOrderId: payload.app_trans_id ?? payload.apptransid ?? null,
      requestId: payload.zp_trans_id ? String(payload.zp_trans_id) : null,
      providerTransactionId: payload.zp_trans_id
        ? String(payload.zp_trans_id)
        : null,
      amount: payload.amount ? Number(payload.amount) : null,
      status: this.mapProviderStatus(payload),
      rawPayload: payload,
      errorCode: null,
      errorMessage: valid ? null : 'invalid signature',
    };
  }
}
