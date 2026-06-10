import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  PaymentGatewayTransactionStatus,
  Prisma,
} from '.prisma/client/commerce';
import { CommercePrismaService } from '../../prisma/commerce-prisma.service';
import {
  SUCCESS_STATUSES,
  TERMINAL_STATUSES,
} from './constants/payment-gateway-status.constants';
import { GatewayVerificationResult } from './adapters/payment-gateway-adapter.interface';

@Injectable()
export class PaymentGatewayCallbackService {
  constructor(private readonly prisma: CommercePrismaService) {}

  async processCallback(
    transactionId: string,
    type: string,
    verification: GatewayVerificationResult,
    payload: Record<string, unknown>,
    headers?: Record<string, unknown>,
  ) {
    const tx = await this.prisma.paymentGatewayTransaction.findUnique({
      where: { id: transactionId },
    });
    if (!tx) throw new NotFoundException('transaction not found');

    const log = await this.prisma.paymentGatewayCallbackLog.create({
      data: {
        transactionId: tx.id,
        provider: tx.provider,
        type,
        payload: payload as Prisma.InputJsonValue,
        headers: headers ? (headers as Prisma.InputJsonValue) : undefined,
        signatureValid: verification.valid,
      },
    });

    if (!verification.valid) {
      await this.prisma.paymentGatewayCallbackLog.update({
        where: { id: log.id },
        data: { processed: true, errorMessage: 'invalid signature' },
      });
      throw new BadRequestException('invalid signature');
    }

    if (
      verification.amount != null &&
      Number(tx.amount) !== Number(verification.amount)
    ) {
      await this.prisma.paymentGatewayTransaction.update({
        where: { id: tx.id },
        data: {
          status: PaymentGatewayTransactionStatus.UNKNOWN,
          errorCode: 'AMOUNT_MISMATCH',
          errorMessage: 'amount mismatch',
          lastCallbackAt: new Date(),
        },
      });
      await this.prisma.paymentGatewayCallbackLog.update({
        where: { id: log.id },
        data: { processed: true, errorMessage: 'amount mismatch' },
      });
      throw new BadRequestException('amount mismatch');
    }

    if (
      TERMINAL_STATUSES.has(tx.status) &&
      tx.status === PaymentGatewayTransactionStatus.PAID
    ) {
      await this.prisma.paymentGatewayCallbackLog.update({
        where: { id: log.id },
        data: { processed: true, processingResult: { alreadyPaid: true } },
      });
      return {
        alreadyProcessed: true,
        transactionId: tx.id,
        status: tx.status,
      };
    }

    const nextStatus = verification.status;
    const updatedTx = await this.prisma.paymentGatewayTransaction.update({
      where: { id: tx.id },
      data: {
        status: nextStatus,
        providerTransactionId:
          verification.providerTransactionId ?? tx.providerTransactionId,
        verifiedPayload: verification.rawPayload as Prisma.InputJsonValue,
        lastCallbackAt: new Date(),
        paidAt: SUCCESS_STATUSES.has(nextStatus) ? new Date() : tx.paidAt,
        failedAt:
          nextStatus === PaymentGatewayTransactionStatus.FAILED
            ? new Date()
            : tx.failedAt,
        errorCode: verification.errorCode ?? null,
        errorMessage: verification.errorMessage ?? null,
      },
    });

    if (tx.paymentId) {
      await this.prisma.payment.update({
        where: { id: tx.paymentId },
        data: {
          status: SUCCESS_STATUSES.has(nextStatus)
            ? PaymentStatus.PAID
            : PaymentStatus.FAILED,
          paidAt: SUCCESS_STATUSES.has(nextStatus) ? new Date() : undefined,
          provider: tx.provider,
          transactionNo:
            verification.providerTransactionId ??
            tx.providerTransactionId ??
            tx.providerOrderId,
        },
      });
    }

    if (tx.orderId) {
      const paymentSucceeded = SUCCESS_STATUSES.has(nextStatus);
      const order = await this.prisma.onlineOrder.findUnique({
        where: { id: tx.orderId },
        select: { status: true },
      });
      await this.prisma.onlineOrder.update({
        where: { id: tx.orderId },
        data: {
          paymentStatus: paymentSucceeded
            ? PaymentStatus.PAID
            : PaymentStatus.FAILED,
          ...(paymentSucceeded && order?.status === OrderStatus.PENDING
            ? { status: OrderStatus.CONFIRMED }
            : {}),
        },
      });
    }

    await this.prisma.paymentGatewayCallbackLog.update({
      where: { id: log.id },
      data: {
        processed: true,
        processingResult: { status: nextStatus },
      },
    });

    return updatedTx;
  }
}
