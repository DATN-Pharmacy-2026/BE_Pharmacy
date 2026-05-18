import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '.prisma/client/commerce';
import { CommercePrismaService } from '../../prisma/commerce-prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { QueryBrandsDto } from './dto/query-brands.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: CommercePrismaService) {}

  async findAll(query: QueryBrandsDto) {
    const { page = 1, limit = 20, search, isActive } = query;
    const where: Prisma.BrandWhereInput = {
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
              { country: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.brand.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.brand.count({ where }),
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
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async create(dto: CreateBrandDto) {
    try {
      return await this.prisma.brand.create({ data: dto });
    } catch (error) {
      this.handleUniqueError(error, 'Brand slug already exists');
      throw error;
    }
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.findOne(id);
    try {
      return await this.prisma.brand.update({ where: { id }, data: dto });
    } catch (error) {
      this.handleUniqueError(error, 'Brand slug already exists');
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.brand.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private handleUniqueError(error: unknown, message: string): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(message);
    }
  }
}
