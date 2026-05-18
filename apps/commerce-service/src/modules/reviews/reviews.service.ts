import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReviewStatus } from '.prisma/client/commerce';
import { Request } from 'express';
import { CommercePrismaService } from '../../prisma/commerce-prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

type RequestWithUser = Request & { user?: { id?: string } };

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: CommercePrismaService) {}

  async findAll(query: QueryReviewsDto) {
    const { page = 1, limit = 20, productId, userId, status, rating } = query;

    const where: Prisma.ReviewWhereInput = {
      ...(productId ? { productId } : {}),
      ...(userId ? { userId } : {}),
      ...(status ? { status } : {}),
      ...(rating ? { rating } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
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

  async findByProduct(productId: string, query: QueryReviewsDto) {
    return this.findAll({ ...query, productId });
  }

  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  async create(req: RequestWithUser, dto: CreateReviewDto) {
    const userId = req.user?.id ?? dto.userId;
    if (!userId) {
      throw new BadRequestException('userId is required when unauthenticated');
    }

    await this.ensureProductExists(dto.productId);

    const existing = await this.prisma.review.findFirst({
      where: { productId: dto.productId, userId },
    });
    if (existing) {
      throw new ConflictException('Duplicate review for product by this user');
    }

    return this.prisma.review.create({
      data: {
        productId: dto.productId,
        userId,
        rating: dto.rating,
        content: dto.content,
        status: ReviewStatus.PENDING,
      },
    });
  }

  async update(id: string, dto: UpdateReviewDto) {
    await this.findOne(id);

    return this.prisma.review.update({
      where: { id },
      data: {
        ...(dto.rating !== undefined ? { rating: dto.rating } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
      },
    });
  }

  async moderate(id: string, dto: ModerateReviewDto) {
    await this.findOne(id);
    return this.prisma.review.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.review.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async ensureProductExists(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');
  }
}
