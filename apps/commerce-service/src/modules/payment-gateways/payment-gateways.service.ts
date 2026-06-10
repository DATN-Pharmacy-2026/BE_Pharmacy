import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventPublisherService } from '@app/event-bus';
import { EVENT_TYPES } from '@app/event-contracts';
import {
  PaymentGatewayProvider,
  PaymentGatewayTransactionStatus,
  PaymentStatus,
  Prisma,
} from '.prisma/client/commerce';
import { CommercePrismaService } from '../../prisma/commerce-prisma.service';
import { PAYMENT_GATEWAY_CURRENCY } from './constants/payment-gateway.constants';
import { InitiatePaymentGatewayDto } from './dto/initiate-payment-gateway.dto';
import { QueryPaymentGatewayTransactionsDto } from './dto/query-payment-gateway-transactions.dto';
import { SyncPaymentGatewayTransactionDto } from './dto/sync-payment-gateway-transaction.dto';
import { PaymentGatewayConfigService } from './payment-gateway-config.service';
import { PaymentGatewayAdapter } from './adapters/payment-gateway-adapter.interface';
import { VnpayPaymentAdapter } from './adapters/vnpay-payment.adapter';
import { MomoPaymentAdapter } from './adapters/momo-payment.adapter';
import { ZalopayPaymentAdapter } from './adapters/zalopay-payment.adapter';
import { PaymentGatewayCallbackService } from './payment-gateway-callback.service';
import { randomUUID } from 'crypto';

@Injectable()
export class PaymentGatewaysService {
  private readonly adapters: Record<
    PaymentGatewayProvider,
    PaymentGatewayAdapter
  >;

  constructor(
    private readonly prisma: CommercePrismaService,
    private readonly config: PaymentGatewayConfigService,
    private readonly callbackService: PaymentGatewayCallbackService,
    private readonly eventPublisher: EventPublisherService,
    vnpayAdapter: VnpayPaymentAdapter,
    momoAdapter: MomoPaymentAdapter,
    zalopayAdapter: ZalopayPaymentAdapter,
  ) {
    this.adapters = {
      VNPAY: vnpayAdapter,
      MOMO: momoAdapter,
      ZALOPAY: zalopayAdapter,
    };
  }

  getProviders() {
    return {
      providers: Object.values(PaymentGatewayProvider).map((provider) => ({
        provider,
        enabled:
          this.config.isGatewayEnabled() &&
          this.config.isProviderEnabled(provider),
        sandbox: this.config.isSandbox(),
      })),
    };
  }

  async findTransactions(query: QueryPaymentGatewayTransactionsDto) {
    const {
      page = 1,
      limit = 20,
      provider,
      status,
      paymentId,
      orderId,
      branchId,
      warehouseId,
      customerUserId,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const allowedSortFields = ['createdAt', 'updatedAt', 'status', 'provider'];
    if (!allowedSortFields.includes(sortBy)) {
      throw new BadRequestException('Invalid sort field');
    }
    const where: Prisma.PaymentGatewayTransactionWhereInput = {
      ...(provider ? { provider } : {}),
      ...(status ? { status } : {}),
      ...(paymentId ? { paymentId } : {}),
      ...(orderId ? { orderId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(customerUserId ? { customerUserId } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.paymentGatewayTransaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          paymentId: true,
          orderId: true,
          provider: true,
          providerOrderId: true,
          providerTransactionId: true,
          requestId: true,
          amount: true,
          currency: true,
          status: true,
          paidAt: true,
          failedAt: true,
          expiredAt: true,
          errorCode: true,
          errorMessage: true,
          branchId: true,
          warehouseId: true,
          customerUserId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.paymentGatewayTransaction.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findTransactionById(id: string) {
    const tx = await this.prisma.paymentGatewayTransaction.findUnique({
      where: { id },
    });
    if (!tx) throw new NotFoundException('transaction not found');
    return tx;
  }

  async initiate(
    dto: InitiatePaymentGatewayDto,
    context?: { branchId?: string; warehouseId?: string },
  ) {
    if (
      !this.config.isGatewayEnabled() ||
      !this.config.isProviderEnabled(dto.provider)
    ) {
      throw new BadRequestException('provider disabled');
    }
    if (!dto.paymentId && !dto.orderId)
      throw new BadRequestException('paymentId or orderId is required');
    if ((dto.currency ?? PAYMENT_GATEWAY_CURRENCY) !== PAYMENT_GATEWAY_CURRENCY)
      throw new BadRequestException('invalid currency');

    if (dto.idempotencyKey) {
      const found = await this.prisma.paymentGatewayTransaction.findFirst({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (found) {
        return {
          transaction: found,
          paymentUrl: found.paymentUrl,
          qrCodeUrl: found.qrCodeUrl,
          deeplink: found.deeplink,
          appLink: found.appLink,
        };
      }
    }

    const payment = dto.paymentId
      ? await this.prisma.payment.findUnique({ where: { id: dto.paymentId } })
      : null;
    const order = dto.orderId
      ? await this.prisma.onlineOrder.findUnique({ where: { id: dto.orderId } })
      : payment
        ? await this.prisma.onlineOrder.findUnique({
            where: { id: payment.onlineOrderId },
          })
        : null;

    if (dto.paymentId && !payment)
      throw new NotFoundException('payment not found');
    if ((dto.orderId || payment) && !order)
      throw new NotFoundException('order not found');

    const amount = payment
      ? Number(payment.amount)
      : order
        ? Number(order.grandTotal)
        : dto.amount;
    if (!amount || amount <= 0) throw new BadRequestException('invalid amount');
    if (payment && payment.status !== PaymentStatus.PENDING)
      throw new BadRequestException('payment/order not payable');

    const existingActive =
      await this.prisma.paymentGatewayTransaction.findFirst({
        where: {
          paymentId: payment?.id ?? null,
          status: {
            in: [
              PaymentGatewayTransactionStatus.INITIATED,
              PaymentGatewayTransactionStatus.PENDING,
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    if (existingActive && !dto.idempotencyKey)
      throw new ConflictException('duplicate active transaction');

    const requestId = dto.requestId ?? `${dto.provider}-${Date.now()}`;
    const providerOrderId = `${dto.provider}-${(order?.orderNo ?? order?.id ?? payment?.id ?? Date.now().toString()).replace(/[^A-Za-z0-9]/g, '').slice(0, 24)}-${Date.now()}`;
    const returnUrl =
      dto.returnUrl ??
      `${process.env.PAYMENT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/payment-gateways/${dto.provider.toLowerCase()}/return`;
    const ipnUrl =
      dto.ipnUrl ??
      `${process.env.PAYMENT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/payment-gateways/${dto.provider.toLowerCase()}/ipn`;

    const adapter = this.adapters[dto.provider];
    const createdTx = await this.prisma.paymentGatewayTransaction.create({
      data: {
        paymentId: payment?.id ?? null,
        orderId: order?.id ?? null,
        provider: dto.provider,
        providerOrderId,
        requestId,
        idempotencyKey: dto.idempotencyKey ?? null,
        amount,
        currency: PAYMENT_GATEWAY_CURRENCY,
        status: PaymentGatewayTransactionStatus.INITIATED,
        returnUrl,
        ipnUrl,
        branchId: order?.branchId ?? context?.branchId ?? dto.branchId ?? null,
        warehouseId:
          order?.assignedWarehouseId ??
          context?.warehouseId ??
          dto.warehouseId ??
          null,
        customerUserId: order?.userId ?? dto.customerUserId ?? null,
      },
    });

    try {
      const gateway = await adapter.createPayment({
        transactionId: createdTx.id,
        provider: dto.provider,
        amount,
        currency: PAYMENT_GATEWAY_CURRENCY,
        providerOrderId,
        requestId,
        orderInfo: dto.orderInfo ?? order?.orderNo,
        returnUrl,
        ipnUrl,
        locale: dto.locale,
        bankCode: dto.bankCode,
      });

      const updated = await this.prisma.paymentGatewayTransaction.update({
        where: { id: createdTx.id },
        data: {
          status: PaymentGatewayTransactionStatus.PENDING,
          paymentUrl: gateway.paymentUrl ?? null,
          qrCodeUrl: gateway.qrCodeUrl ?? null,
          deeplink: gateway.deeplink ?? null,
          appLink: gateway.appLink ?? null,
          rawRequest: gateway.rawRequest as Prisma.InputJsonValue,
          rawResponse: gateway.rawResponse as Prisma.InputJsonValue,
          expiredAt: gateway.expiresAt ?? null,
        },
      });

      await this.enqueueOutboxEvent({
        eventType: EVENT_TYPES.COMMERCE_PAYMENT_GATEWAY_INITIATED,
        aggregateType: 'PaymentGatewayTransaction',
        aggregateId: updated.id,
        correlationId: randomUUID(),
        idempotencyKey: `payment-gateway:${updated.provider}:${updated.providerOrderId}:initiated`,
        branchId: updated.branchId,
        warehouseId: updated.warehouseId,
        actorUserId: updated.customerUserId,
        payload: {
          paymentId: updated.paymentId,
          orderId: updated.orderId,
          transactionId: updated.id,
          provider: updated.provider,
          providerOrderId: updated.providerOrderId,
          requestId: updated.requestId,
          amount: Number(updated.amount),
          currency: updated.currency,
          branchId: updated.branchId,
          warehouseId: updated.warehouseId,
          customerUserId: updated.customerUserId,
        },
      });

      return {
        transaction: updated,
        paymentUrl: updated.paymentUrl,
        qrCodeUrl: updated.qrCodeUrl,
        deeplink: updated.deeplink,
        appLink: updated.appLink,
      };
    } catch {
      await this.prisma.paymentGatewayTransaction.update({
        where: { id: createdTx.id },
        data: {
          status: PaymentGatewayTransactionStatus.FAILED,
          failedAt: new Date(),
          errorMessage: 'payment gateway create failed',
        },
      });
      throw new BadRequestException('payment gateway create failed');
    }
  }

  async syncTransaction(id: string, dto: SyncPaymentGatewayTransactionDto) {
    const tx = await this.findTransactionById(id);
    const adapter = this.adapters[tx.provider];
    if (!adapter.queryTransaction)
      throw new BadRequestException('provider query is not implemented yet');
    const result = await adapter.queryTransaction({
      providerOrderId: tx.providerOrderId,
      requestId: tx.requestId,
    });
    return this.callbackService.processCallback(
      tx.id,
      'QUERY',
      result,
      result.rawPayload as Record<string, unknown>,
    );
  }

  async handleProviderReturn(
    provider: PaymentGatewayProvider,
    payload: Record<string, any>,
  ) {
    const adapter = this.adapters[provider];
    const verification = await adapter.verifyReturnPayload(payload);
    const tx = await this.prisma.paymentGatewayTransaction.findFirst({
      where: { provider, providerOrderId: verification.providerOrderId ?? '' },
    });
    if (!tx)
      return { provider, valid: verification.valid, status: 'NOT_FOUND' };
    await this.prisma.paymentGatewayCallbackLog.create({
      data: {
        transactionId: tx.id,
        provider,
        type: 'RETURN',
        payload: payload as Prisma.InputJsonValue,
        signatureValid: verification.valid,
        processed: true,
        processingResult: {
          status: verification.status,
        },
      },
    });
    return {
      provider,
      valid: verification.valid,
      transactionId: tx.id,
      status: tx.status,
      mappedStatus: verification.status,
    };
  }

  async handleProviderIpn(
    provider: PaymentGatewayProvider,
    payload: Record<string, any>,
    headers?: Record<string, any>,
  ) {
    const adapter = this.adapters[provider];
    const verification = await adapter.verifyCallbackPayload(payload, headers);
    if (!verification.providerOrderId)
      throw new BadRequestException('invalid provider order id');
    const tx = await this.prisma.paymentGatewayTransaction.findFirst({
      where: { provider, providerOrderId: verification.providerOrderId },
    });
    if (!tx) throw new NotFoundException('transaction not found');
    const processed = await this.callbackService.processCallback(
      tx.id,
      'IPN',
      verification,
      payload,
      headers,
    );
    const nextStatus = (processed as any).status ?? tx.status;
    if (nextStatus === PaymentGatewayTransactionStatus.PAID) {
      await this.enqueueOutboxEvent({
        eventType: EVENT_TYPES.COMMERCE_PAYMENT_GATEWAY_PAID,
        aggregateType: 'PaymentGatewayTransaction',
        aggregateId: tx.id,
        correlationId: randomUUID(),
        idempotencyKey: `payment-gateway:${tx.provider}:${tx.providerOrderId}:paid`,
        branchId: tx.branchId,
        warehouseId: tx.warehouseId,
        actorUserId: tx.customerUserId,
        payload: {
          paymentId: tx.paymentId,
          orderId: tx.orderId,
          transactionId: tx.id,
          provider: tx.provider,
          providerOrderId: tx.providerOrderId,
          providerTransactionId:
            verification.providerTransactionId ?? tx.providerTransactionId,
          amount: Number(tx.amount),
          currency: tx.currency,
          paidAt: new Date().toISOString(),
          branchId: tx.branchId,
          warehouseId: tx.warehouseId,
          customerUserId: tx.customerUserId,
        },
      });
    } else if (
      nextStatus === PaymentGatewayTransactionStatus.FAILED ||
      nextStatus === PaymentGatewayTransactionStatus.CANCELED
    ) {
      await this.enqueueOutboxEvent({
        eventType: EVENT_TYPES.COMMERCE_PAYMENT_GATEWAY_FAILED,
        aggregateType: 'PaymentGatewayTransaction',
        aggregateId: tx.id,
        correlationId: randomUUID(),
        idempotencyKey: `payment-gateway:${tx.provider}:${tx.providerOrderId}:failed`,
        branchId: tx.branchId,
        warehouseId: tx.warehouseId,
        actorUserId: tx.customerUserId,
        payload: {
          paymentId: tx.paymentId,
          orderId: tx.orderId,
          transactionId: tx.id,
          provider: tx.provider,
          providerOrderId: tx.providerOrderId,
          errorCode: verification.errorCode ?? null,
          errorMessage: verification.errorMessage ?? null,
          failedAt: new Date().toISOString(),
          branchId: tx.branchId,
          warehouseId: tx.warehouseId,
          customerUserId: tx.customerUserId,
        },
      });
    }
    return {
      success: true,
      transactionId: tx.id,
      status: (processed as any).status ?? tx.status,
    };
  }

  private async enqueueOutboxEvent(input: {
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    correlationId: string;
    idempotencyKey: string;
    branchId?: string | null;
    warehouseId?: string | null;
    actorUserId?: string | null;
    payload: Record<string, unknown>;
  }) {
    const envelope = this.eventPublisher.buildEnvelope({
      eventId: randomUUID(),
      eventType: input.eventType,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      sourceService: 'commerce-service',
      sourceModule: 'payment-gateways',
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      correlationId: input.correlationId,
      causationId: null,
      idempotencyKey: input.idempotencyKey,
      actorUserId: input.actorUserId ?? null,
      branchId: input.branchId ?? null,
      warehouseId: input.warehouseId ?? null,
      tenantId: null,
      payload: input.payload,
      metadata: null,
    });

    await this.prisma.eventOutbox.create({
      data: {
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        eventVersion: envelope.eventVersion,
        aggregateType: envelope.aggregateType,
        aggregateId: envelope.aggregateId,
        sourceService: envelope.sourceService,
        sourceModule: envelope.sourceModule ?? null,
        correlationId: envelope.correlationId,
        causationId: envelope.causationId ?? null,
        idempotencyKey: envelope.idempotencyKey,
        branchId: envelope.branchId ?? null,
        warehouseId: envelope.warehouseId ?? null,
        actorUserId: envelope.actorUserId ?? null,
        payload: envelope as unknown as Prisma.InputJsonValue,
        metadata: envelope.metadata as Prisma.InputJsonValue,
      },
    });
  }
}
