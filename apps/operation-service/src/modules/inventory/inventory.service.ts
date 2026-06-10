import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '.prisma/client/operation';
import { OperationPrismaService } from '../../prisma/operation-prisma.service';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import {
  PublicCartAvailabilityDto,
  PublicProductAvailabilityQueryDto,
} from './dto/public-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: OperationPrismaService) {}

  async findAll(query: QueryInventoryDto) {
    const {
      page = 1,
      limit = 20,
      productId,
      batchId,
      warehouseId,
      locationId,
      branchId,
      expiryDateFrom,
      expiryDateTo,
      expiringBefore,
      hasAvailableQuantity,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = query;
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
      ...(expiryDateFrom || expiryDateTo || expiringBefore
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
          batch: {
            select: { id: true, batchNo: true, expiryDate: true, status: true },
          },
          warehouse: { select: { id: true, code: true, name: true } },
          location: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPublicAvailability(query: PublicProductAvailabilityQueryDto) {
    const warehouses = await this.prisma.warehouse.findMany({
      where: {
        branchId: query.branchId,
        status: 'ACTIVE',
      },
      select: { id: true, code: true, name: true },
    });

    if (warehouses.length === 0) {
      return {
        productId: query.productId,
        branchId: query.branchId,
        requestedQty: query.quantity,
        availableQty: 0,
        available: false,
        warehouses: [],
      };
    }

    const rows = await this.prisma.inventoryItem.groupBy({
      by: ['warehouseId'],
      where: {
        productId: query.productId,
        warehouseId: { in: warehouses.map((warehouse) => warehouse.id) },
        quantityAvailable: { gt: 0 },
        expiryDate: { gte: new Date() },
      },
      _sum: { quantityAvailable: true },
    });
    const quantities = new Map(
      rows.map((row) => [
        row.warehouseId,
        Number(row._sum.quantityAvailable ?? 0),
      ]),
    );
    const warehouseAvailability = warehouses.map((warehouse) => ({
      ...warehouse,
      availableQty: quantities.get(warehouse.id) ?? 0,
    }));
    const availableQty = warehouseAvailability.reduce(
      (total, warehouse) => total + warehouse.availableQty,
      0,
    );

    return {
      productId: query.productId,
      branchId: query.branchId,
      requestedQty: query.quantity,
      availableQty,
      available: warehouseAvailability.some(
        (warehouse) => warehouse.availableQty >= query.quantity,
      ),
      warehouses: warehouseAvailability,
    };
  }

  async verifyPublicCart(dto: PublicCartAvailabilityDto) {
    const warehouses = await this.prisma.warehouse.findMany({
      where: {
        branchId: dto.branchId,
        status: 'ACTIVE',
      },
      select: { id: true, code: true, name: true },
    });

    for (const warehouse of warehouses) {
      const rows = await this.prisma.inventoryItem.groupBy({
        by: ['productId'],
        where: {
          warehouseId: warehouse.id,
          productId: { in: dto.items.map((item) => item.productId) },
          quantityAvailable: { gt: 0 },
          expiryDate: { gte: new Date() },
        },
        _sum: { quantityAvailable: true },
      });
      const quantities = new Map(
        rows.map((row) => [
          row.productId,
          Number(row._sum.quantityAvailable ?? 0),
        ]),
      );
      const items = dto.items.map((item) => {
        const availableQty = quantities.get(item.productId) ?? 0;
        return {
          ...item,
          availableQty,
          available: availableQty >= item.quantity,
        };
      });

      if (items.every((item) => item.available)) {
        return {
          available: true,
          branchId: dto.branchId,
          warehouseId: warehouse.id,
          warehouseCode: warehouse.code,
          warehouseName: warehouse.name,
          items,
        };
      }
    }

    const itemChecks = await Promise.all(
      dto.items.map((item) =>
        this.getPublicAvailability({
          productId: item.productId,
          branchId: dto.branchId,
          quantity: item.quantity,
        }),
      ),
    );

    return {
      available: false,
      branchId: dto.branchId,
      warehouseId: null,
      items: itemChecks.map((item) => ({
        productId: item.productId,
        requestedQty: item.requestedQty,
        availableQty: item.availableQty,
        available: item.available,
      })),
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        batch: {
          select: { id: true, batchNo: true, expiryDate: true, status: true },
        },
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
    if (threshold < 0)
      throw new BadRequestException('threshold must be non-negative');
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
    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async expiring(
    query: QueryInventoryDto & { beforeDate?: string; days?: number },
  ) {
    const days = query.days ?? 30;
    const beforeDate = query.beforeDate
      ? new Date(query.beforeDate)
      : new Date(Date.now() + days * 86400000);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryItemWhereInput = {
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
      expiryDate: { lte: beforeDate },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventoryItem.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { expiryDate: 'asc' },
        include: { batch: true, warehouse: true, location: true },
      }),
      this.prisma.inventoryItem.count({ where }),
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
}
