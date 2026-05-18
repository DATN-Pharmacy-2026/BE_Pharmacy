import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '.prisma/client/operation';
import { OperationPrismaService } from '../../prisma/operation-prisma.service';
import { QueryInventoryDto } from './dto/query-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: OperationPrismaService) {}

  async findAll(query: QueryInventoryDto) {
    const { page = 1, limit = 20, productId, batchId, warehouseId, locationId, branchId, expiryDateFrom, expiryDateTo, expiringBefore, hasAvailableQuantity, sortBy = 'updatedAt', sortOrder = 'desc' } = query;
    const allowedSortFields = ['updatedAt', 'expiryDate', 'quantityAvailable'];
    if (!allowedSortFields.includes(sortBy)) {
      throw new BadRequestException('Invalid sort field');
    }
    const where: Prisma.InventoryItemWhereInput = {
      ...(productId ? { productId } : {}),
      ...(batchId ? { batchId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(locationId ? { locationId } : {}),
      ...(branchId ? { branchId } : {}),
      ...((expiryDateFrom || expiryDateTo || expiringBefore)
        ? {
            expiryDate: {
              ...(expiryDateFrom ? { gte: new Date(expiryDateFrom) } : {}),
              ...(expiryDateTo ? { lte: new Date(expiryDateTo) } : {}),
              ...(expiringBefore ? { lte: new Date(expiringBefore) } : {}),
            },
          }
        : {}),
      ...(typeof hasAvailableQuantity === 'boolean'
        ? hasAvailableQuantity
          ? { quantityAvailable: { gt: 0 } }
          : { quantityAvailable: { lte: 0 } }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventoryItem.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          batch: { select: { id: true, batchNo: true, expiryDate: true, status: true } },
          warehouse: { select: { id: true, code: true, name: true } },
          location: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        batch: { select: { id: true, batchNo: true, expiryDate: true, status: true } },
        warehouse: { select: { id: true, code: true, name: true } },
        location: { select: { id: true, code: true, name: true } },
      },
    });
    if (!item) throw new NotFoundException('Inventory item not found');
    return item;
  }

  async findByProduct(productId: string, query: QueryInventoryDto) {
    return this.findAll({ ...query, productId });
  }

  async findByWarehouse(warehouseId: string, query: QueryInventoryDto) {
    return this.findAll({ ...query, warehouseId });
  }

  async lowStock(query: QueryInventoryDto & { threshold?: number }) {
    const threshold = query.threshold ?? 10;
    if (threshold < 0) throw new BadRequestException('threshold must be non-negative');
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryItemWhereInput = {
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      quantityAvailable: { lte: threshold },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventoryItem.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { quantityAvailable: 'asc' },
        include: { batch: true, warehouse: true, location: true },
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async expiring(query: QueryInventoryDto & { beforeDate?: string; days?: number }) {
    const days = query.days ?? 30;
    const beforeDate = query.beforeDate ? new Date(query.beforeDate) : new Date(Date.now() + days * 86400000);
    const where: Prisma.InventoryItemWhereInput = {
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
      expiryDate: { lte: beforeDate },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventoryItem.findMany({
        where,
        skip: (query.page! - 1) * query.limit!,
        take: query.limit,
        orderBy: { expiryDate: 'asc' },
        include: { batch: true, warehouse: true, location: true },
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit!),
      },
    };
  }
}
