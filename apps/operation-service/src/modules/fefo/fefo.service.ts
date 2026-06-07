import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AllocationOrderType,
  AllocationStatus,
  InventoryMovementType,
  Prisma,
} from '.prisma/client/operation';
import { Request } from 'express';
import { OperationPrismaService } from '../../prisma/operation-prisma.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { CreateFefoAllocationDto } from './dto/create-fefo-allocation.dto';
import { FefoPreviewDto } from './dto/fefo-preview.dto';
import { QueryFefoAllocationsDto } from './dto/query-fefo-allocations.dto';
import { ReleaseFefoAllocationDto } from './dto/release-fefo-allocation.dto';
import { ReleaseFefoByOrderDto } from './dto/release-fefo-by-order.dto';
import { InternalReserveOnlineOrderDto } from './dto/internal-online-order-inventory.dto';

type AllocationPlanLine = {
  inventoryItemId: string;
  batchId: string;
  expiryDate: Date;
  quantityAvailable: number;
  allocatedQty: number;
};

@Injectable()
export class FefoService {
  constructor(
    private readonly prisma: OperationPrismaService,
    private readonly warehousesService: WarehousesService,
  ) {}

  async findAllocations(query: QueryFefoAllocationsDto) {
    const {
      page = 1,
      limit = 20,
      productId,
      orderType,
      orderId,
      orderItemId,
      warehouseId,
      branchId,
      batchId,
      status,
      expiryDateFrom,
      expiryDateTo,
      dateFrom,
      dateTo,
    } = query;

    const where: Prisma.FEFOAllocationWhereInput = {
      ...(productId ? { productId } : {}),
      ...(orderType ? { orderType } : {}),
      ...(orderId ? { orderId } : {}),
      ...(orderItemId ? { orderItemId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(batchId ? { batchId } : {}),
      ...(status ? { status } : {}),
      ...((expiryDateFrom || expiryDateTo)
        ? {
            expiryDate: {
              ...(expiryDateFrom ? { gte: new Date(expiryDateFrom) } : {}),
              ...(expiryDateTo ? { lte: new Date(expiryDateTo) } : {}),
            },
          }
        : {}),
      ...((dateFrom || dateTo)
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.fEFOAllocation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.fEFOAllocation.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAllocation(id: string) {
    const allocation = await this.prisma.fEFOAllocation.findUnique({ where: { id } });
    if (!allocation) throw new NotFoundException('Allocation not found');
    return allocation;
  }

  async findAllocationsByOrder(orderTypeRaw: string, orderId: string) {
    const orderType = this.parseOrderType(orderTypeRaw);
    const items = await this.prisma.fEFOAllocation.findMany({
      where: { orderType, orderId },
      orderBy: [{ createdAt: 'asc' }],
    });

    return {
      items,
      totals: {
        allocatedQty: items.reduce((sum, i) => sum + i.allocatedQty, 0),
      },
    };
  }

  async preview(req: Request, dto: FefoPreviewDto) {
    const warehouseId = dto.warehouseId ?? this.getHeader(req, 'x-warehouse-id');
    const branchId = dto.branchId ?? this.getHeader(req, 'x-branch-id');
    if (!warehouseId) throw new BadRequestException('warehouseId is required');

    await this.warehousesService.findOne(warehouseId);

    const plan = await this.calculatePlan({
      productId: dto.productId,
      warehouseId,
      branchId,
      quantity: dto.quantity,
      excludeExpired: dto.excludeExpired ?? true,
    });

    return {
      productId: dto.productId,
      warehouseId,
      requestedQty: dto.quantity,
      allocatableQty: plan.allocatableQty,
      shortageQty: plan.shortageQty,
      items: plan.items,
    };
  }

  async allocate(req: Request & { user?: { id?: string } }, dto: CreateFefoAllocationDto) {
    const warehouseId = dto.warehouseId ?? this.getHeader(req, 'x-warehouse-id');
    const branchId = dto.branchId ?? this.getHeader(req, 'x-branch-id');
    if (!warehouseId) throw new BadRequestException('warehouseId is required');

    await this.warehousesService.findOne(warehouseId);

    const activeStatuses: AllocationStatus[] = [AllocationStatus.RESERVED, AllocationStatus.PICKED];
    const duplicate = await this.prisma.fEFOAllocation.findFirst({
      where: {
        orderType: dto.orderType,
        orderId: dto.orderId,
        orderItemId: dto.orderItemId,
        status: { in: activeStatuses },
      },
    });
    if (duplicate) {
      throw new ConflictException('Duplicate active allocation for order item');
    }

    return this.prisma.$transaction(async (tx) => {
      const plan = await this.calculatePlan(
        {
          productId: dto.productId,
          warehouseId,
          branchId,
          quantity: dto.quantity,
          excludeExpired: dto.excludeExpired ?? true,
        },
        tx,
      );

      if ((dto.strict ?? true) && plan.shortageQty > 0) {
        throw new ConflictException('Insufficient inventory');
      }

      const allocationLines = plan.items;
      for (const line of allocationLines) {
        const inventory = await tx.inventoryItem.findUnique({ where: { id: line.inventoryItemId } });
        if (!inventory) throw new NotFoundException('Inventory item not found');

        const nextReserved = inventory.quantityReserved + line.allocatedQty;
        if (nextReserved > inventory.quantityOnHand) {
          throw new BadRequestException('quantityReserved cannot exceed quantityOnHand');
        }
        const nextAvailable = inventory.quantityOnHand - nextReserved;
        if (nextAvailable < 0) {
          throw new BadRequestException('quantityAvailable cannot be negative');
        }

        await tx.inventoryItem.update({
          where: { id: inventory.id },
          data: {
            quantityReserved: nextReserved,
            quantityAvailable: nextAvailable,
          },
        });

        await tx.fEFOAllocation.create({
          data: {
            productId: dto.productId,
            orderType: dto.orderType,
            orderId: dto.orderId,
            orderItemId: dto.orderItemId,
            warehouseId,
            branchId,
            batchId: line.batchId,
            expiryDate: line.expiryDate,
            allocatedQty: line.allocatedQty,
            status: AllocationStatus.RESERVED,
          },
        });
      }

      return {
        productId: dto.productId,
        warehouseId,
        orderType: dto.orderType,
        orderId: dto.orderId,
        orderItemId: dto.orderItemId,
        requestedQty: dto.quantity,
        allocatedQty: allocationLines.reduce((sum, i) => sum + i.allocatedQty, 0),
        shortageQty: plan.shortageQty,
        allocations: allocationLines,
      };
    });
  }

  async releaseAllocation(id: string, dto: ReleaseFefoAllocationDto) {
    return this.prisma.$transaction(async (tx) => {
      const allocation = await tx.fEFOAllocation.findUnique({ where: { id } });
      if (!allocation) throw new NotFoundException('Allocation not found');
      if (
        allocation.status === AllocationStatus.RELEASED ||
        allocation.status === AllocationStatus.CANCELLED ||
        allocation.status === AllocationStatus.CONSUMED
      ) {
        throw new ConflictException('Allocation already released/canceled');
      }

      const inventory = await tx.inventoryItem.findFirst({
        where: {
          productId: allocation.productId,
          batchId: allocation.batchId,
          warehouseId: allocation.warehouseId,
          ...(allocation.branchId ? { branchId: allocation.branchId } : {}),
        },
      });
      if (!inventory) throw new NotFoundException('Inventory item not found');

      const nextReserved = inventory.quantityReserved - allocation.allocatedQty;
      if (nextReserved < 0) {
        throw new BadRequestException('quantityReserved cannot be negative');
      }
      const nextAvailable = inventory.quantityOnHand - nextReserved;
      if (nextAvailable < 0) {
        throw new BadRequestException('quantityAvailable cannot be negative');
      }

      await tx.inventoryItem.update({
        where: { id: inventory.id },
        data: {
          quantityReserved: nextReserved,
          quantityAvailable: nextAvailable,
        },
      });

      const updated = await tx.fEFOAllocation.update({
        where: { id: allocation.id },
        data: { status: AllocationStatus.RELEASED },
      });

      return { ...updated, reason: dto.reason };
    });
  }

  async releaseByOrder(dto: ReleaseFefoByOrderDto) {
    const activeStatuses: AllocationStatus[] = [AllocationStatus.RESERVED, AllocationStatus.PICKED];
    return this.prisma.$transaction(async (tx) => {
      const allocations = await tx.fEFOAllocation.findMany({
        where: {
          orderType: dto.orderType,
          orderId: dto.orderId,
          status: { in: activeStatuses },
        },
      });

      let releasedQty = 0;
      for (const allocation of allocations) {
        const inventory = await tx.inventoryItem.findFirst({
          where: {
            productId: allocation.productId,
            batchId: allocation.batchId,
            warehouseId: allocation.warehouseId,
            ...(allocation.branchId ? { branchId: allocation.branchId } : {}),
          },
        });
        if (!inventory) throw new NotFoundException('Inventory item not found');

        const nextReserved = inventory.quantityReserved - allocation.allocatedQty;
        if (nextReserved < 0) {
          throw new BadRequestException('quantityReserved cannot be negative');
        }
        const nextAvailable = inventory.quantityOnHand - nextReserved;
        if (nextAvailable < 0) {
          throw new BadRequestException('quantityAvailable cannot be negative');
        }

        await tx.inventoryItem.update({
          where: { id: inventory.id },
          data: {
            quantityReserved: nextReserved,
            quantityAvailable: nextAvailable,
          },
        });

        await tx.fEFOAllocation.update({
          where: { id: allocation.id },
          data: { status: AllocationStatus.RELEASED },
        });

        releasedQty += allocation.allocatedQty;
      }

      return {
        orderType: dto.orderType,
        orderId: dto.orderId,
        releasedCount: allocations.length,
        releasedQty,
        reason: dto.reason,
      };
    });
  }

  async reserveOnlineOrder(dto: InternalReserveOnlineOrderDto) {
    const duplicate = await this.prisma.fEFOAllocation.findFirst({
      where: {
        orderType: AllocationOrderType.ONLINE_ORDER,
        orderId: dto.orderId,
        status: { in: [AllocationStatus.RESERVED, AllocationStatus.PICKED] },
      },
    });
    if (duplicate) {
      return { orderId: dto.orderId, reserved: true, duplicate: true };
    }

    return this.prisma.$transaction(async (tx) => {
      let reservedQty = 0;
      for (const item of dto.items) {
        const plan = await this.calculatePlan(
          {
            productId: item.productId,
            warehouseId: dto.warehouseId,
            branchId: dto.branchId,
            quantity: item.quantity,
            excludeExpired: true,
          },
          tx,
        );
        if (plan.shortageQty > 0) {
          throw new ConflictException('Insufficient inventory');
        }

        for (const line of plan.items) {
          const inventory = await tx.inventoryItem.findUnique({ where: { id: line.inventoryItemId } });
          if (!inventory) throw new NotFoundException('Inventory item not found');
          const nextReserved = inventory.quantityReserved + line.allocatedQty;
          const nextAvailable = inventory.quantityOnHand - nextReserved;
          if (nextAvailable < 0) throw new ConflictException('Insufficient inventory');

          await tx.inventoryItem.update({
            where: { id: inventory.id },
            data: {
              quantityReserved: nextReserved,
              quantityAvailable: nextAvailable,
            },
          });
          await tx.fEFOAllocation.create({
            data: {
              productId: item.productId,
              orderType: AllocationOrderType.ONLINE_ORDER,
              orderId: dto.orderId,
              orderItemId: item.orderItemId,
              warehouseId: dto.warehouseId,
              branchId: dto.branchId,
              batchId: line.batchId,
              expiryDate: line.expiryDate,
              allocatedQty: line.allocatedQty,
              status: AllocationStatus.RESERVED,
            },
          });
          reservedQty += line.allocatedQty;
        }
      }
      return { orderId: dto.orderId, reserved: true, reservedQty };
    });
  }

  async releaseOnlineOrder(orderId: string) {
    return this.releaseByOrder({
      orderType: AllocationOrderType.ONLINE_ORDER,
      orderId,
      reason: 'Online order cancelled',
    });
  }

  async consumeOnlineOrder(orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const allocations = await tx.fEFOAllocation.findMany({
        where: {
          orderType: AllocationOrderType.ONLINE_ORDER,
          orderId,
          status: { in: [AllocationStatus.RESERVED, AllocationStatus.PICKED] },
        },
      });
      let consumedQty = 0;
      for (const allocation of allocations) {
        const inventory = await tx.inventoryItem.findFirst({
          where: {
            productId: allocation.productId,
            batchId: allocation.batchId,
            warehouseId: allocation.warehouseId,
          },
        });
        if (!inventory) throw new NotFoundException('Inventory item not found');
        const nextOnHand = inventory.quantityOnHand - allocation.allocatedQty;
        const nextReserved = inventory.quantityReserved - allocation.allocatedQty;
        if (nextOnHand < 0 || nextReserved < 0) {
          throw new BadRequestException('Inventory quantity cannot be negative');
        }

        await tx.inventoryItem.update({
          where: { id: inventory.id },
          data: {
            quantityOnHand: nextOnHand,
            quantityReserved: nextReserved,
            quantityAvailable: nextOnHand - nextReserved,
          },
        });
        await tx.stockMovement.create({
          data: {
            tenantId: '00000000-0000-0000-0000-000000000000',
            productId: allocation.productId,
            warehouseId: allocation.warehouseId,
            locationId: inventory.locationId,
            movementType: InventoryMovementType.SALE_DECREASE,
            quantity: allocation.allocatedQty,
            beforeQuantity: inventory.quantityOnHand,
            afterQuantity: nextOnHand,
            referenceType: 'ONLINE_ORDER',
            referenceId: orderId,
            createdByUserId: '00000000-0000-0000-0000-000000000000',
          },
        });
        await tx.fEFOAllocation.update({
          where: { id: allocation.id },
          data: { status: AllocationStatus.CONSUMED },
        });
        consumedQty += allocation.allocatedQty;
      }
      return { orderId, consumedCount: allocations.length, consumedQty };
    });
  }

  private async calculatePlan(
    input: {
      productId: string;
      warehouseId: string;
      branchId?: string;
      quantity: number;
      excludeExpired: boolean;
    },
    tx: Prisma.TransactionClient | OperationPrismaService = this.prisma,
  ) {
    const now = new Date();
    const inventory = await tx.inventoryItem.findMany({
      where: {
        productId: input.productId,
        warehouseId: input.warehouseId,
        ...(input.branchId ? { branchId: input.branchId } : {}),
        quantityAvailable: { gt: 0 },
        ...(input.excludeExpired ? { expiryDate: { gte: now } } : {}),
      },
      orderBy: [{ expiryDate: 'asc' }, { updatedAt: 'asc' }],
    });

    let remaining = input.quantity;
    const items: AllocationPlanLine[] = [];
    for (const row of inventory) {
      if (remaining <= 0) break;
      const alloc = Math.min(remaining, row.quantityAvailable);
      if (alloc <= 0) continue;
      items.push({
        inventoryItemId: row.id,
        batchId: row.batchId,
        expiryDate: row.expiryDate,
        quantityAvailable: row.quantityAvailable,
        allocatedQty: alloc,
      });
      remaining -= alloc;
    }

    const allocatableQty = input.quantity - remaining;
    return {
      items,
      allocatableQty,
      shortageQty: Math.max(0, remaining),
    };
  }

  private parseOrderType(value: string): AllocationOrderType {
    if (value === AllocationOrderType.ONLINE_ORDER) return AllocationOrderType.ONLINE_ORDER;
    if (value === AllocationOrderType.POS_ORDER) return AllocationOrderType.POS_ORDER;
    throw new BadRequestException('Invalid orderType');
  }

  private getHeader(req: Request, key: string): string | undefined {
    const value = req.headers[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
    return undefined;
  }
}
