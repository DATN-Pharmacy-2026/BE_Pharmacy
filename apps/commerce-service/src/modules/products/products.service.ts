import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '.prisma/client/commerce';
import { CategoriesService } from '../categories/categories.service';
import { CommercePrismaService } from '../../prisma/commerce-prisma.service';
import { BrandsService } from '../brands/brands.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: CommercePrismaService,
    private readonly categoriesService: CategoriesService,
    private readonly brandsService: BrandsService,
  ) {}

  async findAll(query: QueryProductsDto) {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      brandId,
      status,
      requiresPrescription,
      activeIngredient,
      barcode,
      sku,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'status'];
    if (!allowedSortFields.includes(sortBy)) {
      throw new BadRequestException('Invalid sort field');
    }
    const normalizedSearch = search?.trim();
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(categoryId ? { categoryId } : {}),
      ...(brandId ? { brandId } : {}),
      ...(status ? { status } : {}),
      ...(typeof requiresPrescription === 'boolean'
        ? { requiresPrescription }
        : {}),
      ...(activeIngredient
        ? {
            activeIngredient: {
              contains: activeIngredient,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(barcode ? { barcode } : {}),
      ...(sku ? { sku } : {}),
      ...(normalizedSearch
        ? {
            OR: [
              { name: { contains: normalizedSearch, mode: 'insensitive' } },
              { sku: { contains: normalizedSearch, mode: 'insensitive' } },
              { barcode: { contains: normalizedSearch, mode: 'insensitive' } },
              { activeIngredient: { contains: normalizedSearch, mode: 'insensitive' } },
              { registrationNumber: { contains: normalizedSearch, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          categoryId: true,
          brandId: true,
          sku: true,
          barcode: true,
          name: true,
          slug: true,
          status: true,
          requiresPrescription: true,
          unit: true,
          basePrice: true,
          createdAt: true,
          updatedAt: true,
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        brand: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findBySku(sku: string) {
    const product = await this.prisma.product.findFirst({
      where: { sku, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: { barcode, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto) {
    await this.categoriesService.findOne(dto.categoryId);
    if (dto.brandId) await this.brandsService.findOne(dto.brandId);

    try {
      return await this.prisma.product.create({
        data: {
          ...dto,
          status: dto.status ?? ProductStatus.DRAFT,
        },
      });
    } catch (error) {
      this.handleProductUniqueError(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    if (dto.categoryId) await this.categoriesService.findOne(dto.categoryId);
    if (dto.brandId) await this.brandsService.findOne(dto.brandId);

    try {
      return await this.prisma.product.update({ where: { id }, data: dto });
    } catch (error) {
      this.handleProductUniqueError(error);
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async addImage(productId: string, dto: CreateProductImageDto) {
    await this.findOne(productId);
    return this.prisma.productImage.create({
      data: {
        productId,
        url: dto.url,
        alt: dto.alt,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async removeImage(productId: string, imageId: string) {
    await this.findOne(productId);
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException('Product image not found');
    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { id: imageId, deleted: true };
  }

  async addVariant(productId: string, dto: CreateProductVariantDto) {
    await this.findOne(productId);
    try {
      return await this.prisma.productVariant.create({
        data: { ...dto, productId },
      });
    } catch (error) {
      this.handleVariantUniqueError(error);
      throw error;
    }
  }

  async updateVariant(
    productId: string,
    variantId: string,
    dto: UpdateProductVariantDto,
  ) {
    await this.findOne(productId);
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) throw new NotFoundException('Product variant not found');

    try {
      return await this.prisma.productVariant.update({
        where: { id: variantId },
        data: dto,
      });
    } catch (error) {
      this.handleVariantUniqueError(error);
      throw error;
    }
  }

  async removeVariant(productId: string, variantId: string) {
    await this.findOne(productId);
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) throw new NotFoundException('Product variant not found');
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: false },
    });
  }

  private handleProductUniqueError(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta?.target.join(',')
        : String(error.meta?.target ?? '');
      if (target.includes('sku'))
        throw new ConflictException('Product sku already exists');
      if (target.includes('slug'))
        throw new ConflictException('Product slug already exists');
      if (target.includes('barcode'))
        throw new ConflictException('Product barcode already exists');
      throw new ConflictException('Duplicate product value');
    }
  }

  private handleVariantUniqueError(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Product variant sku already exists');
    }
  }
}
