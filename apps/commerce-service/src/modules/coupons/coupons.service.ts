import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CouponStatus, DiscountType, Prisma } from '.prisma/client/commerce';
import { CommercePrismaService } from '../../prisma/commerce-prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { QueryCouponsDto } from './dto/query-coupons.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: CommercePrismaService) {}

  async findAll(query: QueryCouponsDto) {
    const { page = 1, limit = 20, search, code, status, discountType } = query;

    const where: Prisma.CouponWhereInput = {
      ...(code
        ? { code: { contains: this.normalizeCode(code), mode: 'insensitive' } }
        : {}),
      ...(status ? { status } : {}),
      ...(discountType ? { discountType } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.coupon.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count({ where }),
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
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async findByCode(code: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: this.normalizeCode(code) },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async create(dto: CreateCouponDto) {
    this.validateCouponInput(dto);

    try {
      return await this.prisma.coupon.create({
        data: {
          code: this.normalizeCode(dto.code),
          name: dto.name,
          discountType: dto.discountType,
          discountValue: dto.discountValue,
          minOrderAmount: dto.minOrderAmount,
          maxDiscountAmount: dto.maxDiscountAmount,
          usageLimit: dto.usageLimit,
          startsAt: new Date(dto.startsAt),
          endsAt: new Date(dto.endsAt),
          status: dto.status ?? CouponStatus.ACTIVE,
        },
      });
    } catch (error) {
      this.handleUniqueError(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateCouponDto) {
    const existing = await this.findOne(id);

    this.validateCouponInput({
      discountType: dto.discountType ?? existing.discountType,
      discountValue: dto.discountValue ?? Number(existing.discountValue),
      usageLimit: dto.usageLimit ?? existing.usageLimit ?? undefined,
      startsAt: dto.startsAt ?? existing.startsAt.toISOString(),
      endsAt: dto.endsAt ?? existing.endsAt.toISOString(),
    });

    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.discountType !== undefined
          ? { discountType: dto.discountType }
          : {}),
        ...(dto.discountValue !== undefined
          ? { discountValue: dto.discountValue }
          : {}),
        ...(dto.minOrderAmount !== undefined
          ? { minOrderAmount: dto.minOrderAmount }
          : {}),
        ...(dto.maxDiscountAmount !== undefined
          ? { maxDiscountAmount: dto.maxDiscountAmount }
          : {}),
        ...(dto.usageLimit !== undefined ? { usageLimit: dto.usageLimit } : {}),
        ...(dto.startsAt !== undefined
          ? { startsAt: new Date(dto.startsAt) }
          : {}),
        ...(dto.endsAt !== undefined ? { endsAt: new Date(dto.endsAt) } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.coupon.delete({ where: { id } });
    return { id, deleted: true };
  }

  async validateCoupon(dto: ValidateCouponDto) {
    const code = this.normalizeCode(dto.code);
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });

    if (!coupon) {
      return { valid: false, message: 'Coupon not found' };
    }

    if (coupon.status !== CouponStatus.ACTIVE) {
      return { valid: false, message: 'Coupon is not active' };
    }

    const now = new Date();
    if (now < coupon.startsAt || now > coupon.endsAt) {
      return { valid: false, message: 'Coupon expired or not started' };
    }

    const minOrderAmount = coupon.minOrderAmount
      ? Number(coupon.minOrderAmount)
      : 0;
    if (dto.orderAmount < minOrderAmount) {
      return {
        valid: false,
        message: `Order amount must be at least ${minOrderAmount}`,
      };
    }

    if (coupon.usageLimit !== null) {
      const usageCount = await this.prisma.couponUsage.count({
        where: { couponId: coupon.id },
      });
      if (usageCount >= coupon.usageLimit) {
        return { valid: false, message: 'Coupon usage limit reached' };
      }
    }

    const discountAmount = this.calculateDiscountAmount(
      coupon.discountType,
      Number(coupon.discountValue),
      dto.orderAmount,
      coupon.maxDiscountAmount ? Number(coupon.maxDiscountAmount) : undefined,
    );

    return {
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      discountAmount,
      message: 'Coupon is valid',
    };
  }

  async findUsages(couponId: string, page: number = 1, limit: number = 20) {
    await this.findOne(couponId);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.couponUsage.findMany({
        where: { couponId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { usedAt: 'desc' },
      }),
      this.prisma.couponUsage.count({ where: { couponId } }),
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

  private validateCouponInput(input: {
    discountType: DiscountType;
    discountValue: number;
    startsAt: string;
    endsAt: string;
    usageLimit?: number;
  }) {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);

    if (startsAt >= endsAt) {
      throw new BadRequestException(
        'Invalid coupon date range: startsAt must be before endsAt',
      );
    }

    if (input.discountType === DiscountType.PERCENTAGE) {
      if (input.discountValue <= 0 || input.discountValue > 100) {
        throw new BadRequestException(
          'Invalid discount value for percentage coupon',
        );
      }
    }

    if (input.discountType === DiscountType.FIXED_AMOUNT) {
      if (input.discountValue <= 0) {
        throw new BadRequestException(
          'Invalid discount value for fixed amount coupon',
        );
      }
    }

    if (input.usageLimit !== undefined && input.usageLimit <= 0) {
      throw new BadRequestException('usageLimit must be greater than 0');
    }
  }

  private calculateDiscountAmount(
    type: DiscountType,
    value: number,
    orderAmount: number,
    maxDiscountAmount?: number,
  ) {
    let discount =
      type === DiscountType.PERCENTAGE ? (orderAmount * value) / 100 : value;

    if (maxDiscountAmount !== undefined) {
      discount = Math.min(discount, maxDiscountAmount);
    }

    return Math.min(discount, orderAmount);
  }

  private normalizeCode(code: string) {
    return code.trim().toUpperCase();
  }

  private handleUniqueError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Duplicate coupon code');
    }
  }
}
