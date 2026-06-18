import {
  BadRequestException,
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import {
  CartStatus,
  FulfillmentStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '.prisma/client/commerce';
import { Request } from 'express';
import { CommercePrismaService } from '../../prisma/commerce-prisma.service';
import { CheckoutDto } from './dto/checkout.dto';

type RequestWithUser = Request & { user?: { id?: string } };

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: CommercePrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async checkout(req: RequestWithUser, dto: CheckoutDto) {
    const userId = req.user?.id;
    const sessionId = dto.sessionId ?? this.getHeader(req, 'x-session-id');
    const branchId = dto.branchId ?? this.getHeader(req, 'x-branch-id');
    let assignedWarehouseId =
      dto.assignedWarehouseId ?? this.getHeader(req, 'x-warehouse-id');

    if (!userId && !sessionId) {
      throw new BadRequestException(
        'sessionId is required for guest checkout when user is unauthenticated',
      );
    }

    const cart = await this.resolveCart(dto.cartId, {
      userId,
      sessionId,
      branchId,
    });

    const cartWithItems = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                status: true,
                deletedAt: true,
              },
            },
            variant: {
              select: { id: true, sku: true },
            },
          },
        },
      },
    });

    if (!cartWithItems) throw new NotFoundException('Cart not found');
    if (cartWithItems.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }
    const unavailableProduct = cartWithItems.items.find(
      (item) => item.product.deletedAt || item.product.status !== 'ACTIVE',
    );
    if (unavailableProduct) {
      throw new BadRequestException(
        `Product is not available for sale: ${unavailableProduct.product.name}`,
      );
    }
    if (!branchId) {
      throw new BadRequestException('branchId is required to verify inventory');
    }

    const availability = await this.verifyOperationInventory(
      branchId,
      cartWithItems.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    );
    if (!availability.available || !availability.warehouseId) {
      const shortage = availability.items?.find((item: any) => !item.available);
      const shortageProduct = shortage
        ? cartWithItems.items.find(
            (item) => item.productId === shortage.productId,
          )
        : undefined;
      throw new BadRequestException(
        shortageProduct
          ? `Insufficient inventory for ${shortageProduct.product.name}`
          : 'Insufficient inventory for this order',
      );
    }
    assignedWarehouseId = String(availability.warehouseId);

    const subtotal = cartWithItems.items.reduce((acc, item) => {
      return acc + Number(item.unitPrice) * item.quantity;
    }, 0);
    const discountTotal = 0;
    const shippingFee = 0;
    const grandTotal = subtotal - discountTotal + shippingFee;

    const paymentFlow = dto.paymentMethod;
    const isMock = paymentFlow === 'MOCK';
    const paymentStatus = isMock ? PaymentStatus.PAID : PaymentStatus.PENDING;
    const paymentMethod =
      paymentFlow === 'COD' ? PaymentMethod.COD : PaymentMethod.E_WALLET;
    const provider =
      paymentFlow === 'VNPAY' || paymentFlow === 'MOMO'
        ? paymentFlow
        : isMock
          ? 'MOCK'
          : null;
    const clientRequestId = dto.clientRequestId?.trim() || null;
    const orderNote = [
      dto.note?.trim(),
      clientRequestId ? `clientRequestId=${clientRequestId}` : null,
    ]
      .filter((segment): segment is string => Boolean(segment))
      .join(' | ');

    const result = await this.prisma.$transaction(async (tx) => {
      const orderNo = await this.generateOrderNo(tx);

      const order = await tx.onlineOrder.create({
        data: {
          orderNo,
          userId,
          branchId: branchId ?? cartWithItems.branchId,
          assignedWarehouseId,
          status: OrderStatus.PENDING,
          paymentStatus,
          fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
          subtotal,
          discountTotal,
          shippingFee,
          grandTotal,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          shippingAddress: dto.shippingAddress,
          note: orderNote || null,
        },
      });

      await tx.onlineOrderItem.createMany({
        data: cartWithItems.items.map((item) => ({
          onlineOrderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          sku: item.variant?.sku ?? item.product.sku,
          productNameSnapshot: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: 0,
          totalAmount: Number(item.unitPrice) * item.quantity,
        })),
      });

      await tx.payment.create({
        data: {
          onlineOrderId: order.id,
          method: paymentMethod,
          provider,
          transactionNo: isMock ? `MOCK-${Date.now()}` : null,
          amount: grandTotal,
          status: paymentStatus,
          paidAt: isMock ? new Date() : null,
        },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cartWithItems.id } });
      await tx.cart.update({
        where: { id: cartWithItems.id },
        data: { status: CartStatus.CHECKED_OUT },
      });

      const newActiveCart = await tx.cart.create({
        data: {
          userId: cartWithItems.userId,
          sessionId: cartWithItems.sessionId,
          branchId: cartWithItems.branchId,
          status: CartStatus.ACTIVE,
        },
      });

      const orderWithRelations = await tx.onlineOrder.findUnique({
        where: { id: order.id },
        include: {
          items: true,
          payments: true,
        },
      });

      return { order: orderWithRelations, newActiveCartId: newActiveCart.id };
    });

    if (!result.order) {
      throw new BadGatewayException(
        'Order was created without inventory reservation data',
      );
    }

    try {
      await this.reserveOperationInventory({
        orderId: result.order.id,
        branchId,
        warehouseId: assignedWarehouseId,
        items: result.order.items.map((item) => ({
          productId: item.productId,
          orderItemId: item.id,
          quantity: item.quantity,
        })),
      });
    } catch (error) {
      await this.prisma.onlineOrder.update({
        where: { id: result.order.id },
        data: {
          status: OrderStatus.CANCELLED,
          fulfillmentStatus: FulfillmentStatus.CANCELLED,
          note: `${result.order.note ?? ''} Inventory reservation failed.`.trim(),
        },
      });
      throw error;
    }

    await this.runNonCriticalSideEffects(result.order);

    const primaryPayment = result.order.payments[0] ?? null;
    return {
      order: {
        id: result.order.id,
        orderNo: result.order.orderNo,
        status: result.order.status,
        paymentStatus: result.order.paymentStatus,
        fulfillmentStatus: result.order.fulfillmentStatus,
        grandTotal: result.order.grandTotal,
        paymentMethod: primaryPayment?.provider ?? primaryPayment?.method ?? null,
        customerName: result.order.customerName,
        customerPhone: result.order.customerPhone,
        shippingAddress: result.order.shippingAddress,
        note: result.order.note,
        createdAt: result.order.createdAt,
        updatedAt: result.order.updatedAt,
        items: result.order.items,
        payments: result.order.payments,
      },
      payment: primaryPayment,
      cart: {
        id: result.newActiveCartId,
      },
      message: 'Đặt hàng thành công',
    };
  }

  private async runNonCriticalSideEffects(order: {
    id: string;
    orderNo: string;
  }): Promise<void> {
    const tasks: Array<{ label: string; run: () => Promise<void> }> = [];

    for (const task of tasks) {
      try {
        await task.run();
      } catch (error) {
        this.logger.warn(
          `Non-critical checkout side effect failed: ${task.label} for order ${order.orderNo} (${order.id})`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  private async resolveCart(
    cartId: string | undefined,
    context: { userId?: string; sessionId?: string; branchId?: string },
  ) {
    if (cartId) {
      const cart = await this.prisma.cart.findUnique({ where: { id: cartId } });
      if (!cart || cart.status !== CartStatus.ACTIVE) {
        throw new NotFoundException('Cart not found');
      }
      return cart;
    }

    const ownerWhere = context.userId
      ? { userId: context.userId }
      : { userId: null, sessionId: context.sessionId ?? null };

    const cart = await this.prisma.cart.findFirst({
      where: {
        status: CartStatus.ACTIVE,
        ...ownerWhere,
        branchId: context.branchId ?? null,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!cart) throw new NotFoundException('Cart not found');
    return cart;
  }

  private async generateOrderNo(tx: Prisma.TransactionClient): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const random = Math.floor(100000 + Math.random() * 900000);
      const orderNo = `ORD-${yyyy}${mm}${dd}-${random}`;

      const exists = await tx.onlineOrder.findUnique({ where: { orderNo } });
      if (!exists) return orderNo;
    }

    throw new BadRequestException('Failed to generate unique order number');
  }

  private getHeader(req: RequestWithUser, key: string): string | undefined {
    const value = req.headers[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
    return undefined;
  }

  private async verifyOperationInventory(
    branchId: string,
    items: Array<{ productId: string; quantity: number }>,
  ): Promise<any> {
    const operationServiceUrl = this.configService.get<string>(
      'gateway.services.operation',
      'http://localhost:3003',
    );
    try {
      const response = await this.httpService.axiosRef.post(
        `${operationServiceUrl.replace(/\/+$/, '')}/api/public-inventory/verify-cart`,
        { branchId, items },
        { timeout: 5000 },
      );
      return response.data;
    } catch {
      throw new BadGatewayException('Unable to verify inventory');
    }
  }

  private async reserveOperationInventory(payload: {
    orderId: string;
    branchId: string;
    warehouseId: string;
    items: Array<{ productId: string; orderItemId: string; quantity: number }>;
  }): Promise<void> {
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
        `${operationServiceUrl.replace(/\/+$/, '')}/api/internal-inventory/online-orders/reserve`,
        payload,
        {
          timeout: 5000,
          headers: { 'x-internal-service-key': serviceKey },
        },
      );
    } catch {
      throw new BadGatewayException('Unable to reserve inventory');
    }
  }
}
