import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentStatus,
  POSOrderStatus,
  Prisma,
} from '.prisma/client/operation';
import { OperationPrismaService } from '../../prisma/operation-prisma.service';
import { QueryPosPaymentsDto } from './dto/query-pos-payments.dto';
import { UpdatePosPaymentStatusDto } from './dto/update-pos-payment-status.dto';

@Injectable()
export class PosPaymentsService {
  constructor(private readonly prisma: OperationPrismaService) {}

  private mapPosPaymentListItem(
    payment: {
      id: string;
      posOrderId: string;
      method: string;
      amount: Prisma.Decimal;
      status: PaymentStatus;
      paidAt: Date | null;
      posOrder: {
        id: string;
        orderNo: string;
        status: POSOrderStatus;
        grandTotal: Prisma.Decimal;
        branchId: string;
        posSessionId: string;
        cashierUserId: string;
        createdAt: Date;
        receipt?: { id: string; receiptNo: string; issuedAt: Date } | null;
      };
    },
  ) {
    return {
      ...payment,
      createdAt: payment.paidAt ?? payment.posOrder.createdAt,
      totalAmount: Number(payment.amount ?? 0),
      paymentMethod: payment.method,
      paymentStatus: payment.status,
      orderNo: payment.posOrder.orderNo,
      posCode: payment.posOrder.orderNo,
      grandTotal: Number(payment.posOrder.grandTotal ?? 0),
      receiptId: payment.posOrder.receipt?.id ?? null,
      receiptCode: payment.posOrder.receipt?.receiptNo ?? null,
      customerName: 'Khách lẻ',
      customerPhone: null,
      cashierUserId: payment.posOrder.cashierUserId,
      cashierName: null,
      posOrder: {
        ...payment.posOrder,
        totalAmount: Number(payment.posOrder.grandTotal ?? 0),
        customerName: 'Khách lẻ',
        customerPhone: null,
        cashierName: null,
        receiptId: payment.posOrder.receipt?.id ?? null,
        receiptCode: payment.posOrder.receipt?.receiptNo ?? null,
        paymentMethod: payment.method,
        paymentStatus: payment.status,
        receipt: payment.posOrder.receipt
          ? {
              ...payment.posOrder.receipt,
              receiptCode: payment.posOrder.receipt.receiptNo,
              createdAt: payment.posOrder.receipt.issuedAt,
            }
          : null,
      },
    };
  }

  async findAll(query: QueryPosPaymentsDto) {
    const {
      page = 1,
      limit = 20,
      posOrderId,
      branchId,
      posSessionId,
      cashierUserId,
      method,
      status,
      dateFrom,
      dateTo,
    } = query;
    const where: Prisma.POSPaymentWhereInput = {
      ...(posOrderId ? { posOrderId } : {}),
      ...(branchId || posSessionId || cashierUserId
        ? {
            posOrder: {
              ...(branchId ? { branchId } : {}),
              ...(posSessionId ? { posSessionId } : {}),
              ...(cashierUserId ? { cashierUserId } : {}),
            },
          }
        : {}),
      ...(method ? { method } : {}),
      ...(status ? { status } : {}),
      ...(dateFrom || dateTo
        ? {
            OR: [
              {
                paidAt: {
                  ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                  ...(dateTo ? { lte: new Date(dateTo) } : {}),
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.pOSPayment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { paidAt: 'desc' },
        include: {
          posOrder: {
            select: {
              id: true,
              orderNo: true,
              status: true,
              grandTotal: true,
              branchId: true,
              posSessionId: true,
              cashierUserId: true,
              createdAt: true,
              receipt: {
                select: {
                  id: true,
                  receiptNo: true,
                  issuedAt: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.pOSPayment.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapPosPaymentListItem(item)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const payment = await this.prisma.pOSPayment.findUnique({
      where: { id },
      include: {
        posOrder: {
          select: { id: true, orderNo: true, status: true, grandTotal: true },
        },
      },
    });
    if (!payment) throw new NotFoundException('POS payment not found');
    return payment;
  }

  async findByOrder(posOrderId: string) {
    return this.prisma.pOSPayment.findMany({
      where: { posOrderId },
      orderBy: { paidAt: 'desc' },
    });
  }

  async updateStatus(id: string, dto: UpdatePosPaymentStatusDto) {
    const payment = await this.findOne(id);
    const updated = await this.prisma.pOSPayment.update({
      where: { id },
      data: {
        status: dto.status,
        paidAt: dto.paidAt
          ? new Date(dto.paidAt)
          : dto.status === PaymentStatus.PAID
            ? (payment.paidAt ?? new Date())
            : payment.paidAt,
      },
    });

    if (dto.status === PaymentStatus.PAID) {
      const order = await this.prisma.pOSOrder.findUnique({
        where: { id: payment.posOrderId },
        include: { payments: true },
      });
      if (!order) throw new NotFoundException('POS order not found');
      const paidTotal = order.payments
        .filter((p) => p.status === PaymentStatus.PAID || p.id === updated.id)
        .reduce((sum, p) => sum + Number(p.amount), 0);
      if (
        paidTotal >= Number(order.grandTotal) &&
        order.status === POSOrderStatus.CREATED
      ) {
        await this.prisma.pOSOrder.update({
          where: { id: order.id },
          data: { status: POSOrderStatus.COMPLETED },
        });
      }
    }

    if (
      dto.status === PaymentStatus.FAILED &&
      payment.posOrder.status === POSOrderStatus.COMPLETED
    ) {
      throw new ConflictException(
        'Cannot mark payment failed for completed order',
      );
    }

    return this.findOne(id);
  }
}
