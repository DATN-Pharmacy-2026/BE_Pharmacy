import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus, Prisma } from '.prisma/client/commerce';
import { Request } from 'express';
import { CommercePrismaService } from '../../prisma/commerce-prisma.service';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: CommercePrismaService) {}

  private hasPermission(req: Request | undefined, permission: string): boolean {
    const permissions = (req as Request & { user?: { permissions?: string[] } })?.user
      ?.permissions;
    return Array.isArray(permissions) && permissions.includes(permission);
  }

  private getUserId(req: Request | undefined): string | undefined {
    return (req as Request & { user?: { id?: string } })?.user?.id;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private toPaymentResponse(
    payment: Prisma.PaymentGetPayload<{
      include: { onlineOrder: { select: { orderNo: true } } };
    }>,
  ) {
    return {
      id: payment.id,
      // keep backward compatibility
      onlineOrderId: payment.onlineOrderId,
      // explicit alias for clients
      orderId: payment.onlineOrderId,
      orderCode: payment.onlineOrder?.orderNo ?? null,
      method: payment.method,
      provider: payment.provider,
      transactionNo: payment.transactionNo,
      amount: payment.amount,
      status: payment.status,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    };
  }

  async findAll(query: QueryPaymentsDto) {
    const {
      page = 1,
      limit = 20,
      q,
      onlineOrderId,
      method,
      provider,
      status,
      dateFrom,
      dateTo,
    } = query;
    const search = q?.trim();

    const orSearch: Prisma.PaymentWhereInput[] = [];
    if (search) {
      orSearch.push({
        onlineOrder: { is: { orderNo: { contains: search, mode: 'insensitive' } } },
      });
      if (this.isUuid(search)) {
        orSearch.push({ id: search });
        orSearch.push({ onlineOrderId: search });
      }
    }

    const where: Prisma.PaymentWhereInput = {
      ...(onlineOrderId ? { onlineOrderId } : {}),
      ...(method ? { method } : {}),
      ...(provider
        ? { provider: { contains: provider, mode: 'insensitive' } }
        : {}),
      ...(status ? { status } : {}),
      ...(orSearch.length ? { OR: orSearch } : {}),
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
        include: {
          onlineOrder: {
            select: { orderNo: true },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      items: items.map((payment) => this.toPaymentResponse(payment)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, req?: Request) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        onlineOrder: {
          select: { orderNo: true, userId: true },
        },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (
      this.hasPermission(req, 'customer.payment.view_self') &&
      !this.hasPermission(req, 'payment.view')
    ) {
      const userId = this.getUserId(req);
      if (!userId || payment.onlineOrder?.userId !== userId) {
        throw new NotFoundException('Payment not found');
      }
    }
    return this.toPaymentResponse(payment);
  }

  async findByOrder(onlineOrderId: string, req?: Request) {
    if (
      this.hasPermission(req, 'customer.payment.view_self') &&
      !this.hasPermission(req, 'payment.view')
    ) {
      const order = await this.prisma.onlineOrder.findUnique({
        where: { id: onlineOrderId },
        select: { userId: true },
      });
      const userId = this.getUserId(req);
      if (!order || !userId || order.userId !== userId) {
        return { items: [] };
      }
    }

    const payments = await this.prisma.payment.findMany({
      where: { onlineOrderId },
      orderBy: { createdAt: 'desc' },
      include: {
        onlineOrder: {
          select: { orderNo: true },
        },
      },
    });
    return { items: payments.map((payment) => this.toPaymentResponse(payment)) };
  }

  async updateStatus(id: string, dto: UpdatePaymentStatusDto) {
    const existingPayment = await this.prisma.payment.findUnique({ where: { id } });
    if (!existingPayment) throw new NotFoundException('Payment not found');

    const nextPaidAt =
      dto.status === PaymentStatus.PAID
        ? dto.paidAt
          ? new Date(dto.paidAt)
          : (existingPayment.paidAt ?? new Date())
        : null;

    await this.prisma.payment.update({
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
      where: { id: existingPayment.onlineOrderId },
      data: { paymentStatus: orderPaymentStatus },
    });

    return this.findOne(id);
  }
}
