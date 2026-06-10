import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BatchStatus, Prisma } from '.prisma/client/operation';
import { SuppliersService } from '../suppliers/suppliers.service';
import { OperationPrismaService } from '../../prisma/operation-prisma.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { QueryBatchesDto } from './dto/query-batches.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';

@Injectable()
export class BatchesService {
  constructor(
    private readonly prisma: OperationPrismaService,
    private readonly suppliersService: SuppliersService,
  ) {}

  async findAll(query: QueryBatchesDto) {
    const {
      page = 1,
      limit = 20,
      productId,
      batchNo,
      supplierId,
      status,
      expiryDateFrom,
      expiryDateTo,
      expiringBefore,
    } = query;
    const where: Prisma.BatchWhereInput = {
      ...(productId ? { productId } : {}),
      ...(batchNo
        ? { batchNo: { contains: batchNo, mode: 'insensitive' } }
        : {}),
      ...(supplierId ? { supplierId } : {}),
      ...(status ? { status } : {}),
      ...(expiryDateFrom || expiryDateTo || expiringBefore
        ? {
            expiryDate: {
              ...(expiryDateFrom ? { gte: new Date(expiryDateFrom) } : {}),
              ...(expiryDateTo ? { lte: new Date(expiryDateTo) } : {}),
              ...(expiringBefore ? { lte: new Date(expiringBefore) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.batch.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { supplier: { select: { id: true, code: true, name: true } } },
      }),
      this.prisma.batch.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: { supplier: { select: { id: true, code: true, name: true } } },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  async findByProduct(productId: string, query: QueryBatchesDto) {
    return this.findAll({ ...query, productId });
  }

  async create(dto: CreateBatchDto) {
    await this.validateDates(dto.manufactureDate, dto.expiryDate);
    if (dto.supplierId) await this.suppliersService.findOne(dto.supplierId);

    try {
      return await this.prisma.batch.create({
        data: {
          productId: dto.productId,
          batchNo: dto.batchNo,
          manufactureDate: dto.manufactureDate
            ? new Date(dto.manufactureDate)
            : null,
          expiryDate: new Date(dto.expiryDate),
          supplierId: dto.supplierId,
          status: dto.status ?? BatchStatus.ACTIVE,
        },
      });
    } catch (error) {
      this.handleUniqueError(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateBatchDto) {
    const existing = await this.findOne(id);
    const manufactureDate =
      dto.manufactureDate ??
      (existing.manufactureDate
        ? existing.manufactureDate.toISOString()
        : undefined);
    const expiryDate = dto.expiryDate ?? existing.expiryDate.toISOString();

    await this.validateDates(manufactureDate, expiryDate);
    if (dto.supplierId) await this.suppliersService.findOne(dto.supplierId);

    return this.prisma.batch.update({
      where: { id },
      data: {
        ...(dto.manufactureDate !== undefined
          ? {
              manufactureDate: dto.manufactureDate
                ? new Date(dto.manufactureDate)
                : null,
            }
          : {}),
        ...(dto.expiryDate !== undefined
          ? { expiryDate: new Date(dto.expiryDate) }
          : {}),
        ...(dto.supplierId !== undefined ? { supplierId: dto.supplierId } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  async remove(id: string) {
    const batch = await this.findOne(id);
    const linked = await this.prisma.goodsReceiptItem.count({
      where: { batchId: batch.id },
    });
    if (linked > 0) {
      return this.prisma.batch.update({
        where: { id },
        data: { status: BatchStatus.EXPIRED },
      });
    }
    return this.prisma.batch.delete({ where: { id } });
  }

  private async validateDates(manufactureDate?: string, expiryDate?: string) {
    if (!expiryDate) throw new BadRequestException('expiryDate is required');
    if (manufactureDate && new Date(manufactureDate) >= new Date(expiryDate)) {
      throw new BadRequestException(
        'manufactureDate must be before expiryDate',
      );
    }
  }

  private handleUniqueError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Duplicate batchNo for product');
    }
  }
}
