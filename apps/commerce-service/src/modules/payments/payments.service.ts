import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus, Prisma } from '.prisma/client/commerce';
import { CommercePrismaService } from '../../prisma/commerce-prisma.service';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: CommercePrismaService) {}

  async findAll(query: QueryPaymentsDto) {
    const {
      page = 1,
      limit = 20,
      onlineOrderId,
      method,
      provider,
      status,
      dateFrom,
      dateTo,
    } = query;

    const where: Prisma.PaymentWhereInput = {
      ...(onlineOrderId ? { onlineOrderId } : {}),
      ...(method ? { method } : {}),
      ...(provider
        ? { provider: { contains: provider, mode: 'insensitive' } }
        : {}),
      ...(status ? { status } : {}),
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
      this.prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async findByOrder(onlineOrderId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { onlineOrderId },
      orderBy: { createdAt: 'desc' },
    });
    return { items: payments };
  }

  async updateStatus(id: string, dto: UpdatePaymentStatusDto) {
    const payment = await this.findOne(id);

    const nextPaidAt =
      dto.status === PaymentStatus.PAID
        ? dto.paidAt
          ? new Date(dto.paidAt)
          : (payment.paidAt ?? new Date())
        : null;

    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.transactionNo ? { transactionNo: dto.transactionNo } : {}),
        ...(dto.provider ? { provider: dto.provider } : {}),
        paidAt: nextPaidAt,
      },
    });

    const orderPaymentStatus =
      dto.status === PaymentStatus.PAID ? PaymentStatus.PAID : dto.status;

    await this.prisma.onlineOrder.update({
      where: { id: payment.onlineOrderId },
      data: { paymentStatus: orderPaymentStatus },
    });

    return updated;
  }
}
