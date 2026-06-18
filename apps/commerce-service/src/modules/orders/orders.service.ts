import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import {
  FulfillmentStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '.prisma/client/commerce';
import { Request } from 'express';
import { CommercePrismaService } from '../../prisma/commerce-prisma.service';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: CommercePrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private hasPermission(req: Request | undefined, permission: string): boolean {
    const permissions = (req as Request & { user?: { permissions?: string[] } })
      ?.user?.permissions;
    return Array.isArray(permissions) && permissions.includes(permission);
  }

  private getUserId(req: Request | undefined): string | undefined {
    return (req as Request & { user?: { id?: string } })?.user?.id;
  }

  async findAll(query: QueryOrdersDto, req?: Request) {
    const {
      page = 1,
      limit = 20,
      search,
      userId,
      branchId,
      assignedWarehouseId,
      status,
      paymentStatus,
      fulfillmentStatus,
      customerPhone,
      orderNo,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const allowedSortFields = [
      'createdAt',
      'updatedAt',
      'status',
      'paymentStatus',
    ];
    if (!allowedSortFields.includes(sortBy)) {
      throw new BadRequestException('Invalid sort field');
    }
    const normalizedSearch = search?.trim();

    const branchIdFilter = branchId ?? this.getHeader(req, 'x-branch-id');
    // Do not implicitly scope orders by warehouse header.
    // Orders are often created before warehouse assignment, so header-scoping
    // can hide valid records unexpectedly in admin list.
    const warehouseFilter = assignedWarehouseId;

    const where: Prisma.OnlineOrderWhereInput = {
      ...(userId ? { userId } : {}),
      ...(branchIdFilter ? { branchId: branchIdFilter } : {}),
      ...(warehouseFilter ? { assignedWarehouseId: warehouseFilter } : {}),
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(fulfillmentStatus ? { fulfillmentStatus } : {}),
      ...(customerPhone
        ? { customerPhone: { contains: customerPhone, mode: 'insensitive' } }
        : {}),
      ...(orderNo
        ? { orderNo: { contains: orderNo, mode: 'insensitive' } }
        : {}),
      ...(normalizedSearch
        ? {
            OR: [
              { orderNo: { contains: normalizedSearch, mode: 'insensitive' } },
              {
                customerName: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
              {
                customerPhone: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
              {
                shippingAddress: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
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
      this.prisma.onlineOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          orderNo: true,
          userId: true,
          branchId: true,
          assignedWarehouseId: true,
          status: true,
          paymentStatus: true,
          fulfillmentStatus: true,
          grandTotal: true,
          note: true,
          shippingAddress: true,
          customerName: true,
          customerPhone: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { items: true } },
          payments: {
            select: {
              id: true,
              status: true,
              method: true,
              provider: true,
              amount: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.onlineOrder.count({ where }),
    ]);

    return {
      items: items.map((order) => ({
        ...order,
        itemCount: order._count.items,
        paymentSummary: order.payments[0] ?? null,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findMyOrders(req: Request, query: QueryOrdersDto) {
    const userId = (req as Request & { user?: { id?: string } }).user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authentication is required');
    }

    return this.findAll({ ...query, userId }, req);
  }

  async findOne(id: string, req?: Request) {
    const order = await this.prisma.onlineOrder.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (
      this.hasPermission(req, 'customer.order.view_self') &&
      !this.hasPermission(req, 'order.view')
    ) {
      const userId = this.getUserId(req);
      if (!userId || order.userId !== userId) {
        throw new NotFoundException('Order not found');
      }
    }
    return order;
  }

  async findByOrderNo(orderNo: string, req?: Request) {
    const order = await this.prisma.onlineOrder.findFirst({
      where: { orderNo },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (
      this.hasPermission(req, 'customer.order.view_self') &&
      !this.hasPermission(req, 'order.view')
    ) {
      const userId = this.getUserId(req);
      if (!userId || order.userId !== userId) {
        throw new NotFoundException('Order not found');
      }
    }
    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    if (!dto.status && !dto.paymentStatus && !dto.fulfillmentStatus) {
      throw new BadRequestException('At least one status field is required');
    }

    const existing = await this.findOne(id);
    if (
      existing.status === OrderStatus.CANCELLED &&
      dto.status &&
      dto.status !== OrderStatus.CANCELLED
    ) {
      throw new ConflictException('Cancelled order status cannot be changed');
    }

    const latestPayment = existing.payments
      .slice()
      .sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      )[0];
    const requestedPaymentStatus = dto.paymentStatus ?? existing.paymentStatus;
    const isCod = latestPayment?.method === PaymentMethod.COD;
    const completingOrder =
      dto.status === OrderStatus.COMPLETED &&
      existing.status !== OrderStatus.COMPLETED;
    const nextPaymentStatus =
      completingOrder && isCod ? PaymentStatus.PAID : requestedPaymentStatus;

    if (completingOrder && nextPaymentStatus !== PaymentStatus.PAID) {
      throw new ConflictException(
        'Order cannot be completed before payment is paid',
      );
    }

    if (
      dto.status === OrderStatus.COMPLETED &&
      existing.status !== OrderStatus.COMPLETED
    ) {
      await this.updateOperationInventory('consume', id);
    }
    if (
      dto.status === OrderStatus.CANCELLED &&
      existing.status !== OrderStatus.CANCELLED
    ) {
      await this.updateOperationInventory('release', id);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.onlineOrder.update({
        where: { id },
        data: {
          ...(dto.status ? { status: dto.status } : {}),
          ...(nextPaymentStatus !== existing.paymentStatus
            ? { paymentStatus: nextPaymentStatus }
            : {}),
          ...(dto.fulfillmentStatus
            ? { fulfillmentStatus: dto.fulfillmentStatus }
            : {}),
        },
      });

      if (nextPaymentStatus !== existing.paymentStatus) {
        await tx.payment.updateMany({
          where: { onlineOrderId: id },
          data: {
            status: nextPaymentStatus,
            ...(nextPaymentStatus === PaymentStatus.PAID
              ? { paidAt: new Date() }
              : {}),
          },
        });
      }
    });

    return this.findOne(id);
  }

  async cancelOrder(id: string, dto: CancelOrderDto, req?: Request) {
    const order = await this.findOne(id, req);
    if (
      this.hasPermission(req, 'customer.order.cancel_self') &&
      !this.hasPermission(req, 'order.cancel')
    ) {
      const userId = this.getUserId(req);
      if (!userId || order.userId !== userId) {
        throw new NotFoundException('Order not found');
      }
    }
    if (order.status === OrderStatus.CANCELLED) {
      return order;
    }
    if (order.status === OrderStatus.COMPLETED) {
      throw new ConflictException('Completed order cannot be cancelled');
    }

    await this.updateOperationInventory('release', id);

    const paymentStatus =
      order.paymentStatus === PaymentStatus.PAID
        ? PaymentStatus.PAID
        : PaymentStatus.PENDING;
    const noteSuffix =
      order.paymentStatus === PaymentStatus.PAID
        ? ' [TODO: refund required]'
        : '';
    const reasonSegment = dto.reason ? ` Cancel reason: ${dto.reason}.` : '';

    await this.prisma.onlineOrder.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        fulfillmentStatus: FulfillmentStatus.CANCELLED,
        paymentStatus,
        note: `${order.note ?? ''}${reasonSegment}${noteSuffix}`.trim() || null,
      },
    });

    return this.findOne(id, req);
  }

  private getHeader(req: Request | undefined, key: string): string | undefined {
    if (!req) return undefined;
    const value = req.headers[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
    return undefined;
  }

  private async updateOperationInventory(
    action: 'release' | 'consume',
    orderId: string,
  ): Promise<void> {
    const operationServiceUrl = this.configService.get<string>(
      'gateway.services.operation',
      'http://localhost:3003',
    );
    const serviceKey = this.configService.get<string>(
      'internal.serviceKey',
      'pharmplus-internal-dev',
    );
    try {
      await this.httpService.axiosRef.post(
        `${operationServiceUrl.replace(/\/+$/, '')}/api/internal-inventory/online-orders/${action}`,
        { orderId },
        {
          timeout: 5000,
          headers: { 'x-internal-service-key': serviceKey },
        },
      );
    } catch {
      throw new ConflictException(`Unable to ${action} order inventory`);
    }
  }
}
