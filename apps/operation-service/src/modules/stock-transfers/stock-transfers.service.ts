import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryMovementType, Prisma, ShipmentStatus, StockTransferStatus } from '.prisma/client/operation';
import { Request } from 'express';
import { OperationPrismaService } from '../../prisma/operation-prisma.service';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { QueryStockTransfersDto } from './dto/query-stock-transfers.dto';
import { ReceiveStockTransferDto } from './dto/receive-stock-transfer.dto';
import { ShipStockTransferDto } from './dto/ship-stock-transfer.dto';
import { UpdateStockTransferStatusDto } from './dto/update-stock-transfer-status.dto';

@Injectable()
export class StockTransfersService {
  constructor(private readonly prisma: OperationPrismaService) {}

  async findAll(query: QueryStockTransfersDto) {
    const { page = 1, limit = 20, search, transferNo, fromWarehouseId, toWarehouseId, fromBranchId, toBranchId, status, requestedByUserId, approvedByUserId, dateFrom, dateTo } = query;

    const where: Prisma.StockTransferWhereInput = {
      ...(transferNo ? { transferNo: { contains: transferNo, mode: 'insensitive' } } : {}),
      ...(fromWarehouseId ? { fromWarehouseId } : {}),
      ...(toWarehouseId ? { toWarehouseId } : {}),
      ...(fromBranchId ? { fromBranchId } : {}),
      ...(toBranchId ? { toBranchId } : {}),
      ...(status ? { status } : {}),
      ...(requestedByUserId ? { requestedByUserId } : {}),
      ...(approvedByUserId ? { approvedByUserId } : {}),
      ...((dateFrom || dateTo)
        ? {
            requestedAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { transferNo: { contains: search, mode: 'insensitive' } },
              { shipments: { some: { shipmentNo: { contains: search, mode: 'insensitive' } } } },
              { shipments: { some: { trackingNo: { contains: search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.stockTransfer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { requestedAt: 'desc' },
        include: {
          items: true,
          shipments: { orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.stockTransfer.count({ where }),
    ]);

    return {
      items: items.map((t) => ({ ...t, itemCount: t._count.items, latestShipment: t.shipments[0] ?? null })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        items: true,
        shipments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!transfer) throw new NotFoundException('Stock transfer not found');
    return transfer;
  }

  async findByTransferNo(transferNo: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { transferNo },
      include: {
        items: true,
        shipments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!transfer) throw new NotFoundException('Stock transfer not found');
    return transfer;
  }

  async timeline(id: string) {
    const transfer = await this.findOne(id);
    const events = [
      { type: 'REQUESTED', at: transfer.requestedAt },
      transfer.approvedAt ? { type: 'APPROVED', at: transfer.approvedAt } : null,
      transfer.shippedAt ? { type: 'SHIPPED', at: transfer.shippedAt } : null,
      transfer.receivedAt ? { type: 'RECEIVED', at: transfer.receivedAt } : null,
    ].filter(Boolean);

    return { transferId: transfer.id, status: transfer.status, events };
  }

  async create(req: Request & { user?: { id?: string } }, dto: CreateStockTransferDto) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('fromWarehouseId and toWarehouseId must be different');
    }

    await this.assertWarehouseExists(dto.fromWarehouseId, 'fromWarehouseId');
    await this.assertWarehouseExists(dto.toWarehouseId, 'toWarehouseId');
    if (dto.fromBranchId) await this.assertBranchExists(dto.fromBranchId, 'fromBranchId');
    if (dto.toBranchId) await this.assertBranchExists(dto.toBranchId, 'toBranchId');

    for (const item of dto.items) {
      await this.assertBatchExists(item.batchId);
      const sourceInventory = await this.prisma.inventoryItem.findFirst({
        where: {
          productId: item.productId,
          batchId: item.batchId,
          warehouseId: dto.fromWarehouseId,
        },
      });
      if (!sourceInventory) throw new NotFoundException('Source inventory item not found');
      if (sourceInventory.quantityAvailable < item.requestedQty) {
        throw new ConflictException('Insufficient source inventory');
      }
    }

    const requestedByUserId = this.getUserId(req.user?.id);

    return this.prisma.$transaction(async (tx) => {
      const transferNo = await this.generateTransferNo(tx);
      const transfer = await tx.stockTransfer.create({
        data: {
          transferNo,
          fromWarehouseId: dto.fromWarehouseId,
          toWarehouseId: dto.toWarehouseId,
          fromBranchId: dto.fromBranchId,
          toBranchId: dto.toBranchId,
          requestedByUserId,
          status: StockTransferStatus.PENDING_APPROVAL,
          requestedAt: new Date(),
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              batchId: item.batchId,
              requestedQty: item.requestedQty,
              shippedQty: 0,
              receivedQty: 0,
            })),
          },
        },
      });

      return this.findOne(transfer.id);
    });
  }

  async updateStatus(id: string, dto: UpdateStockTransferStatusDto) {
    const transfer = await this.findOne(id);
    this.assertStatusTransition(transfer.status, dto.status);
    return this.prisma.stockTransfer.update({ where: { id }, data: { status: dto.status } });
  }

  async approve(id: string, req: Request & { user?: { id?: string } }) {
    const transfer = await this.findOne(id);

    if (transfer.status !== StockTransferStatus.PENDING_APPROVAL) {
      throw new ConflictException('Invalid transfer status transition');
    }

    for (const item of transfer.items) {
      const inventory = await this.prisma.inventoryItem.findFirst({
        where: { productId: item.productId, batchId: item.batchId ?? undefined, warehouseId: transfer.fromWarehouseId },
      });
      if (!inventory) throw new NotFoundException('Source inventory item not found');
      if (inventory.quantityAvailable < item.requestedQty) {
        throw new ConflictException('Insufficient source inventory');
      }
    }

    return this.prisma.stockTransfer.update({
      where: { id },
      data: {
        status: StockTransferStatus.APPROVED,
        approvedByUserId: this.getUserId(req.user?.id),
        approvedAt: new Date(),
      },
      include: { items: true, shipments: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async ship(id: string, req: Request & { user?: { id?: string } }, dto: ShipStockTransferDto) {
    const transfer = await this.findOne(id);
    if (transfer.status !== StockTransferStatus.APPROVED) {
      throw new ConflictException('Invalid transfer status transition');
    }

    const shippedByUserId = this.getUserId(req.user?.id);
    const shippedAt = dto.shippedAt ? new Date(dto.shippedAt) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const inputMap = new Map((dto.items ?? []).map((i) => [i.stockTransferItemId, i.shippedQty]));

      const txItems = await tx.stockTransferItem.findMany({ where: { stockTransferId: transfer.id } });

      for (const item of txItems) {
        const shippedQty = inputMap.has(item.id) ? (inputMap.get(item.id) as number) : item.requestedQty;
        if (shippedQty < 0) throw new BadRequestException('quantity cannot be negative');
        if (shippedQty > item.requestedQty) throw new BadRequestException('shippedQty cannot exceed requestedQty');

        const sourceInventory = await tx.inventoryItem.findFirst({
          where: {
            productId: item.productId,
            batchId: item.batchId ?? undefined,
            warehouseId: transfer.fromWarehouseId,
          },
        });
        if (!sourceInventory) throw new NotFoundException('Source inventory item not found');
        if (sourceInventory.quantityAvailable < shippedQty) throw new ConflictException('Insufficient source inventory');

        const beforeQty = sourceInventory.quantityOnHand;
        const afterQty = beforeQty - shippedQty;
        const afterAvailable = afterQty - sourceInventory.quantityReserved;
        if (afterQty < 0 || afterAvailable < 0) throw new ConflictException('quantity cannot be negative');

        await tx.inventoryItem.update({
          where: { id: sourceInventory.id },
          data: {
            quantityOnHand: afterQty,
            quantityAvailable: afterAvailable,
          },
        });

        await tx.stockTransferItem.update({
          where: { id: item.id },
          data: { shippedQty },
        });

        await tx.stockMovement.create({
          data: {
            tenantId: '00000000-0000-0000-0000-000000000000',
            productId: item.productId,
            warehouseId: transfer.fromWarehouseId,
            movementType: InventoryMovementType.TRANSFER_OUT,
            quantity: shippedQty,
            beforeQuantity: beforeQty,
            afterQuantity: afterQty,
            referenceType: 'STOCK_TRANSFER',
            referenceId: transfer.id,
            createdByUserId: shippedByUserId,
          },
        });
      }

      const shipmentNo = await this.generateShipmentNo(tx);
      await tx.shipment.create({
        data: {
          stockTransferId: transfer.id,
          shipmentNo,
          carrierName: dto.carrierName,
          trackingNo: dto.trackingNo,
          status: ShipmentStatus.IN_TRANSIT,
          shippedByUserId,
          shippedAt,
        },
      });

      await tx.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: StockTransferStatus.SHIPPED,
          shippedAt,
        },
      });

      return this.findOne(transfer.id);
    });
  }

  async receive(id: string, req: Request & { user?: { id?: string } }, dto: ReceiveStockTransferDto) {
    const transfer = await this.findOne(id);
    if (transfer.status !== StockTransferStatus.SHIPPED) {
      throw new ConflictException('Invalid transfer status transition');
    }

    const receivedAt = dto.receivedAt ? new Date(dto.receivedAt) : new Date();
    const receivedByUserId = this.getUserId(req.user?.id);

    return this.prisma.$transaction(async (tx) => {
      const inputMap = new Map((dto.items ?? []).map((i) => [i.stockTransferItemId, i.receivedQty]));
      const txItems = await tx.stockTransferItem.findMany({ where: { stockTransferId: transfer.id } });

      for (const item of txItems) {
        const shippedQty = item.shippedQty ?? 0;
        const receivedQty = inputMap.has(item.id) ? (inputMap.get(item.id) as number) : shippedQty;

        if (receivedQty < 0) throw new BadRequestException('quantity cannot be negative');
        if (receivedQty > shippedQty) throw new BadRequestException('receivedQty cannot exceed shippedQty');

        const batch = item.batchId ? await tx.batch.findUnique({ where: { id: item.batchId } }) : null;
        if (item.batchId && !batch) throw new NotFoundException('Batch not found');

        const sourceInventory = await tx.inventoryItem.findFirst({
          where: {
            productId: item.productId,
            batchId: item.batchId ?? undefined,
            warehouseId: transfer.fromWarehouseId,
          },
        });

        const destinationInventory = await tx.inventoryItem.findFirst({
          where: {
            productId: item.productId,
            batchId: item.batchId ?? undefined,
            warehouseId: transfer.toWarehouseId,
          },
        });

        if (destinationInventory) {
          const beforeQty = destinationInventory.quantityOnHand;
          const afterQty = beforeQty + receivedQty;
          const afterAvailable = afterQty - destinationInventory.quantityReserved;

          await tx.inventoryItem.update({
            where: { id: destinationInventory.id },
            data: {
              quantityOnHand: afterQty,
              quantityAvailable: afterAvailable,
            },
          });

          await tx.stockMovement.create({
            data: {
              tenantId: '00000000-0000-0000-0000-000000000000',
              productId: item.productId,
              warehouseId: transfer.toWarehouseId,
              movementType: InventoryMovementType.TRANSFER_IN,
              quantity: receivedQty,
              beforeQuantity: beforeQty,
              afterQuantity: afterQty,
              referenceType: 'STOCK_TRANSFER',
              referenceId: transfer.id,
              createdByUserId: receivedByUserId,
            },
          });
        } else {
          const created = await tx.inventoryItem.create({
            data: {
              productId: item.productId,
              batchId: item.batchId as string,
              warehouseId: transfer.toWarehouseId,
              locationId: null,
              branchId: transfer.toBranchId,
              quantityOnHand: receivedQty,
              quantityReserved: 0,
              quantityAvailable: receivedQty,
              unitCost: sourceInventory?.unitCost ?? null,
              expiryDate: sourceInventory?.expiryDate ?? batch?.expiryDate ?? new Date(),
            },
          });

          await tx.stockMovement.create({
            data: {
              tenantId: '00000000-0000-0000-0000-000000000000',
              productId: item.productId,
              warehouseId: transfer.toWarehouseId,
              movementType: InventoryMovementType.TRANSFER_IN,
              quantity: receivedQty,
              beforeQuantity: 0,
              afterQuantity: created.quantityOnHand,
              referenceType: 'STOCK_TRANSFER',
              referenceId: transfer.id,
              createdByUserId: receivedByUserId,
            },
          });
        }

        await tx.stockTransferItem.update({ where: { id: item.id }, data: { receivedQty } });
      }

      const latestShipment = await tx.shipment.findFirst({ where: { stockTransferId: transfer.id }, orderBy: { createdAt: 'desc' } });
      if (latestShipment) {
        await tx.shipment.update({
          where: { id: latestShipment.id },
          data: {
            status: ShipmentStatus.DELIVERED,
            receivedByUserId,
            deliveredAt: receivedAt,
          },
        });
      }

      await tx.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: StockTransferStatus.RECEIVED,
          receivedAt,
        },
      });

      return this.findOne(transfer.id);
    });
  }

  async cancel(id: string) {
    const transfer = await this.findOne(id);
    if (
      transfer.status === StockTransferStatus.SHIPPED ||
      transfer.status === StockTransferStatus.RECEIVED
    ) {
      throw new ConflictException('cannot cancel shipped transfer');
    }

    return this.prisma.stockTransfer.update({ where: { id }, data: { status: StockTransferStatus.CANCELLED } });
  }

  private assertStatusTransition(current: StockTransferStatus, next: StockTransferStatus) {
    const transitions: Record<StockTransferStatus, StockTransferStatus[]> = {
      [StockTransferStatus.DRAFT]: [StockTransferStatus.PENDING_APPROVAL, StockTransferStatus.CANCELLED],
      [StockTransferStatus.PENDING_APPROVAL]: [StockTransferStatus.APPROVED, StockTransferStatus.CANCELLED],
      [StockTransferStatus.APPROVED]: [StockTransferStatus.SHIPPED, StockTransferStatus.CANCELLED],
      [StockTransferStatus.SHIPPED]: [StockTransferStatus.RECEIVED],
      [StockTransferStatus.RECEIVED]: [StockTransferStatus.RECEIVED],
      [StockTransferStatus.CANCELLED]: [StockTransferStatus.CANCELLED],
    };

    if (!transitions[current]?.includes(next)) {
      throw new ConflictException('invalid transfer status transition');
    }
  }

  private async assertWarehouseExists(id: string, field: string) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) throw new NotFoundException(`${field} warehouse not found`);
  }

  private async assertBranchExists(id: string, field: string) {
    const branch = await this.prisma.branch.findFirst({ where: { id, deletedAt: null } });
    if (!branch) throw new NotFoundException(`${field} branch not found`);
  }

  private async assertBatchExists(id: string) {
    const batch = await this.prisma.batch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException('Batch not found');
  }

  private getUserId(userId?: string) {
    return userId ?? '00000000-0000-0000-0000-000000000000';
  }

  private async generateTransferNo(tx: Prisma.TransactionClient): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const rand = Math.floor(100000 + Math.random() * 900000);
      const transferNo = `ST-${y}${m}${d}-${rand}`;
      const exists = await tx.stockTransfer.findUnique({ where: { transferNo } });
      if (!exists) return transferNo;
    }
    throw new BadRequestException('Failed to generate transfer number');
  }

  private async generateShipmentNo(tx: Prisma.TransactionClient): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const rand = Math.floor(100000 + Math.random() * 900000);
      const shipmentNo = `SHP-${y}${m}${d}-${rand}`;
      const exists = await tx.shipment.findUnique({ where: { shipmentNo } });
      if (!exists) return shipmentNo;
    }
    throw new BadRequestException('Failed to generate shipment number');
  }
}
