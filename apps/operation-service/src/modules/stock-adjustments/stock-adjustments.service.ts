import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InventoryMovementType,
  Prisma,
  StockAdjustmentStatus,
} from '.prisma/client/operation';
import { Request } from 'express';
import { BranchesService } from '../branches/branches.service';
import { OperationPrismaService } from '../../prisma/operation-prisma.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { QueryStockAdjustmentsDto } from './dto/query-stock-adjustments.dto';
import { UpdateStockAdjustmentStatusDto } from './dto/update-stock-adjustment-status.dto';

@Injectable()
export class StockAdjustmentsService {
  constructor(
    private readonly prisma: OperationPrismaService,
    private readonly warehousesService: WarehousesService,
    private readonly branchesService: BranchesService,
  ) {}

  async findAll(query: QueryStockAdjustmentsDto) {
    const {
      page = 1,
      limit = 20,
      warehouseId,
      branchId,
      status,
      createdByUserId,
      approvedByUserId,
      dateFrom,
      dateTo,
      search,
    } = query;
    const where: Prisma.StockAdjustmentWhereInput = {
      ...(warehouseId ? { warehouseId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(status ? { status } : {}),
      ...(createdByUserId ? { createdByUserId } : {}),
      ...(approvedByUserId ? { approvedByUserId } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
      ...(search ? { reason: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.stockAdjustment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { items: true } } },
      }),
      this.prisma.stockAdjustment.count({ where }),
    ]);

    return {
      items: items.map((i) => ({ ...i, itemCount: i._count.items })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const adjustment = await this.prisma.stockAdjustment.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!adjustment) throw new NotFoundException('Stock adjustment not found');
    return adjustment;
  }

  async create(
    req: Request & { user?: { id?: string } },
    dto: CreateStockAdjustmentDto,
  ) {
    await this.warehousesService.findOne(dto.warehouseId);
    if (dto.branchId) await this.branchesService.findOne(dto.branchId);

    const createdByUserId =
      req.user?.id ?? '00000000-0000-0000-0000-000000000000';

    return this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.stockAdjustment.create({
        data: {
          warehouseId: dto.warehouseId,
          branchId: dto.branchId,
          reason: dto.reason,
          status: StockAdjustmentStatus.DRAFT,
          createdByUserId,
        },
      });

      for (const item of dto.items) {
        const inventory = await tx.inventoryItem.findFirst({
          where: {
            warehouseId: dto.warehouseId,
            productId: item.productId,
            ...(item.batchId ? { batchId: item.batchId } : {}),
          },
        });

        const oldQuantity = inventory?.quantityOnHand ?? 0;
        const difference = item.newQuantity - oldQuantity;

        await tx.stockAdjustmentItem.create({
          data: {
            stockAdjustmentId: adjustment.id,
            productId: item.productId,
            batchId: item.batchId,
            oldQuantity,
            newQuantity: item.newQuantity,
            difference,
          },
        });
      }

      return this.findOne(adjustment.id);
    });
  }

  async updateStatus(
    id: string,
    req: Request & { user?: { id?: string } },
    dto: UpdateStockAdjustmentStatusDto,
  ) {
    const adjustment = await this.findOne(id);
    if (
      adjustment.status === StockAdjustmentStatus.APPROVED ||
      adjustment.status === StockAdjustmentStatus.REJECTED
    ) {
      throw new ConflictException('Stock adjustment already finalized');
    }

    if (dto.status !== StockAdjustmentStatus.APPROVED) {
      return this.prisma.stockAdjustment.update({
        where: { id },
        data: { status: dto.status },
      });
    }

    const approvedByUserId =
      req.user?.id ?? '00000000-0000-0000-0000-000000000000';

    return this.prisma.$transaction(async (tx) => {
      const fresh = await tx.stockAdjustment.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!fresh) throw new NotFoundException('Stock adjustment not found');
      if (fresh.status === StockAdjustmentStatus.APPROVED) {
        throw new ConflictException('Stock adjustment already approved');
      }

      for (const item of fresh.items) {
        let inventory = await tx.inventoryItem.findFirst({
          where: {
            warehouseId: fresh.warehouseId,
            productId: item.productId,
            ...(item.batchId ? { batchId: item.batchId } : {}),
          },
        });

        const oldQty = inventory?.quantityOnHand ?? 0;
        const newQty = item.newQuantity;
        if (newQty < 0)
          throw new BadRequestException('quantity cannot be negative');

        if (!inventory) {
          // cannot create inventory without batchId in current schema
          if (!item.batchId) {
            throw new BadRequestException(
              'batchId is required to create new inventory item from adjustment',
            );
          }
          const batch = await tx.batch.findUnique({
            where: { id: item.batchId },
          });
          if (!batch) throw new NotFoundException('Batch not found');

          inventory = await tx.inventoryItem.create({
            data: {
              productId: item.productId,
              batchId: item.batchId,
              warehouseId: fresh.warehouseId,
              branchId: fresh.branchId,
              quantityOnHand: 0,
              quantityReserved: 0,
              quantityAvailable: 0,
              unitCost: null,
              expiryDate: batch.expiryDate,
            },
          });
        }

        if (inventory.quantityReserved > newQty) {
          throw new BadRequestException('quantityAvailable cannot be negative');
        }

        await tx.inventoryItem.update({
          where: { id: inventory.id },
          data: {
            quantityOnHand: newQty,
            quantityAvailable: newQty - inventory.quantityReserved,
          },
        });

        await tx.stockMovement.create({
          data: {
            tenantId: '00000000-0000-0000-0000-000000000000',
            productId: item.productId,
            warehouseId: fresh.warehouseId,
            movementType:
              item.difference >= 0
                ? InventoryMovementType.ADJUSTMENT_INCREASE
                : InventoryMovementType.ADJUSTMENT_DECREASE,
            quantity: Math.abs(item.difference),
            beforeQuantity: oldQty,
            afterQuantity: newQty,
            referenceType: 'STOCK_ADJUSTMENT',
            referenceId: fresh.id,
            createdByUserId: approvedByUserId,
          },
        });
      }

      await tx.stockAdjustment.update({
        where: { id },
        data: {
          status: StockAdjustmentStatus.APPROVED,
          approvedByUserId,
          approvedAt: new Date(),
        },
      });

      return this.findOne(id);
    });
  }
}
