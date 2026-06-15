import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CartStatus, Prisma, ProductStatus } from '.prisma/client/commerce';
import { Request } from 'express';
import { CommercePrismaService } from '../../prisma/commerce-prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { QueryCartDto } from './dto/query-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

type RequestWithUser = Request & {
  user?: {
    id?: string;
  };
};

@Injectable()
export class CartService {
  constructor(private readonly prisma: CommercePrismaService) {}

  async getCurrentCart(req: RequestWithUser, query: QueryCartDto) {
    const context = this.resolveContext(req, query);
    const cart = await this.getOrCreateActiveCart(context);
    return this.buildCartResponse(cart.id);
  }

  async getById(id: string) {
    const cart = await this.prisma.cart.findUnique({ where: { id } });
    if (!cart) throw new NotFoundException('Cart not found');
    return this.buildCartResponse(id);
  }

  async addItem(
    req: RequestWithUser,
    query: QueryCartDto,
    dto: AddCartItemDto,
  ) {
    const context = this.resolveContext(req, query);
    const cart = await this.getOrCreateActiveCart(context);

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, deletedAt: null },
      select: {
        id: true,
        basePrice: true,
        status: true,
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException('Product is not available for sale');
    }

    let variantPrice: Prisma.Decimal | undefined;
    if (dto.variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: dto.variantId },
        select: { id: true, productId: true, isActive: true, price: true },
      });
      if (!variant) throw new NotFoundException('Variant not found');
      if (variant.productId !== dto.productId) {
        throw new ConflictException('Variant does not belong to product');
      }
      if (!variant.isActive) {
        throw new BadRequestException('Variant is inactive');
      }
      variantPrice = variant.price;
    }

    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: dto.productId,
        variantId: dto.variantId ?? null,
      },
      select: { id: true, quantity: true },
    });

    const unitPrice = variantPrice ?? product.basePrice;

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + dto.quantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          variantId: dto.variantId,
          quantity: dto.quantity,
          unitPrice,
        },
      });
    }

    return this.buildCartResponse(cart.id);
  }

  async updateItem(
    req: RequestWithUser,
    query: QueryCartDto,
    itemId: string,
    dto: UpdateCartItemDto,
  ) {
    const context = this.resolveContext(req, query);
    const cart = await this.getOrCreateActiveCart(context);

    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException('Cart item not found');
    if (item.cartId !== cart.id) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    return this.buildCartResponse(cart.id);
  }

  async removeItem(req: RequestWithUser, query: QueryCartDto, itemId: string) {
    const context = this.resolveContext(req, query);
    const cart = await this.getOrCreateActiveCart(context);

    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException('Cart item not found');
    if (item.cartId !== cart.id) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.buildCartResponse(cart.id);
  }

  async clearCurrentCart(req: RequestWithUser, query: QueryCartDto) {
    const context = this.resolveContext(req, query);
    const cart = await this.getOrCreateActiveCart(context);

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.buildCartResponse(cart.id);
  }

  private async getOrCreateActiveCart(context: {
    userId?: string;
    sessionId?: string;
    branchId?: string;
  }) {
    const ownerWhere = context.userId
      ? { userId: context.userId }
      : { userId: null, sessionId: context.sessionId ?? null };

    const existing = await this.prisma.cart.findFirst({
      where: {
        status: CartStatus.ACTIVE,
        ...ownerWhere,
        branchId: context.branchId ?? null,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (existing) return existing;

    return this.prisma.cart.create({
      data: {
        status: CartStatus.ACTIVE,
        userId: context.userId,
        sessionId: context.sessionId,
        branchId: context.branchId,
      },
    });
  }

  private async buildCartResponse(cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                slug: true,
                unit: true,
                status: true,
                images: {
                  orderBy: { sortOrder: 'asc' },
                  take: 1,
                  select: { url: true, alt: true, sortOrder: true }
                },
              },
            },
            variant: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!cart) throw new NotFoundException('Cart not found');

    const totals = cart.items.reduce(
      (acc, item) => {
        const unitPrice = Number(item.unitPrice);
        acc.subtotal += unitPrice * item.quantity;
        acc.itemCount += item.quantity;
        return acc;
      },
      { subtotal: 0, itemCount: 0 },
    );

    return {
      ...cart,
      totals,
    };
  }

  private resolveContext(req: RequestWithUser, query: QueryCartDto) {
    const userId = req.user?.id;
    const headerSessionId = this.getHeader(req, 'x-session-id');
    const sessionId = query.sessionId ?? headerSessionId;
    const branchId = query.branchId;

    if (!userId && !sessionId) {
      // TODO: Enforce strict authenticated cart ownership when auth integration is finalized.
      throw new BadRequestException(
        'sessionId is required for guest cart when user is unauthenticated',
      );
    }

    return { userId, sessionId, branchId };
  }

  private getHeader(req: RequestWithUser, key: string): string | undefined {
    const value = req.headers[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
    return undefined;
  }
}
