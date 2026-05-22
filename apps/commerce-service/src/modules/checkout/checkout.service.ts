import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  constructor(private readonly prisma: CommercePrismaService) {}

  async checkout(req: RequestWithUser, dto: CheckoutDto) {
    const userId = req.user?.id;
    const sessionId = dto.sessionId ?? this.getHeader(req, 'x-session-id');
    const branchId = dto.branchId ?? this.getHeader(req, 'x-branch-id');
    const assignedWarehouseId =
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
              select: { id: true, name: true, sku: true, deletedAt: true },
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

    const subtotal = cartWithItems.items.reduce((acc, item) => {
      return acc + Number(item.unitPrice) * item.quantity;
    }, 0);
    const discountTotal = 0;
    const shippingFee = 0;
    const grandTotal = subtotal - discountTotal + shippingFee;

    const isMock = dto.paymentMethod === 'MOCK';
    const paymentStatus = isMock ? PaymentStatus.PAID : PaymentStatus.PENDING;

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
          note: dto.note,
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
          method: PaymentMethod.COD,
          provider: isMock ? 'MOCK' : null,
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

    return result;
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
}
