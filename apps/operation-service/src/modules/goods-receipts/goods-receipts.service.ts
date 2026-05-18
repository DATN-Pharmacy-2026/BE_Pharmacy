import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BatchStatus, GoodsReceiptStatus, InventoryMovementType, Prisma } from '.prisma/client/operation';
import { Request } from 'express';
import { BranchesService } from '../branches/branches.service';
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service';
import { OperationPrismaService } from '../../prisma/operation-prisma.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { QueryGoodsReceiptsDto } from './dto/query-goods-receipts.dto';
import { UpdateGoodsReceiptStatusDto } from './dto/update-goods-receipt-status.dto';
import { UpdateGoodsReceiptDto } from './dto/update-goods-receipt.dto';

@Injectable()
export class GoodsReceiptsService {
  constructor(
    private readonly prisma: OperationPrismaService,
    private readonly suppliersService: SuppliersService,
    private readonly warehousesService: WarehousesService,
    private readonly branchesService: BranchesService,
    private readonly purchaseOrdersService: PurchaseOrdersService,
  ) {}

  async findAll(query: QueryGoodsReceiptsDto) {
    const { page = 1, limit = 20, search, receiptNo, purchaseOrderId, supplierId, warehouseId, branchId, status, receivedByUserId, receivedDateFrom, receivedDateTo, dateFrom, dateTo } = query;

    const where: Prisma.GoodsReceiptWhereInput = {
      ...(receiptNo ? { receiptNo: { contains: receiptNo, mode: 'insensitive' } } : {}),
      ...(purchaseOrderId ? { purchaseOrderId } : {}),
      ...(supplierId ? { supplierId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(status ? { status } : {}),
      ...(receivedByUserId ? { receivedByUserId } : {}),
      ...((receivedDateFrom || receivedDateTo)
        ? {
            receivedAt: {
              ...(receivedDateFrom ? { gte: new Date(receivedDateFrom) } : {}),
              ...(receivedDateTo ? { lte: new Date(receivedDateTo) } : {}),
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
      ...(search
        ? {
            OR: [
              { receiptNo: { contains: search, mode: 'insensitive' } },
              { note: { contains: search, mode: 'insensitive' } },
              { items: { some: { batchNo: { contains: search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.goodsReceipt.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, code: true, name: true } },
          purchaseOrder: { select: { id: true, poNo: true, status: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.goodsReceipt.count({ where }),
    ]);

    return {
      items: items.map((r) => ({ ...r, itemCount: r._count.items })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const receipt = await this.prisma.goodsReceipt.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, code: true, name: true } },
        purchaseOrder: { select: { id: true, poNo: true, status: true } },
        items: { include: { batch: true } },
      },
    });
    if (!receipt) throw new NotFoundException('Goods receipt not found');
    return receipt;
  }

  async findByReceiptNo(receiptNo: string) {
    const receipt = await this.prisma.goodsReceipt.findUnique({
      where: { receiptNo },
      include: {
        supplier: { select: { id: true, code: true, name: true } },
        purchaseOrder: { select: { id: true, poNo: true, status: true } },
        items: { include: { batch: true } },
      },
    });
    if (!receipt) throw new NotFoundException('Goods receipt not found');
    return receipt;
  }

  async create(req: Request & { user?: { id?: string } }, dto: CreateGoodsReceiptDto) {
    if (!dto.items?.length) throw new BadRequestException('Empty goods receipt items');

    const warehouseId = dto.warehouseId ?? this.getHeader(req, 'x-warehouse-id');
    const branchId = dto.branchId ?? this.getHeader(req, 'x-branch-id');

    if (!warehouseId) throw new BadRequestException('warehouseId is required');

    await this.warehousesService.findOne(warehouseId);
    if (branchId) await this.branchesService.findOne(branchId);

    let supplierId = dto.supplierId;
    if (supplierId) await this.suppliersService.findOne(supplierId);

    if (dto.purchaseOrderId) {
      const po = await this.purchaseOrdersService.findOne(dto.purchaseOrderId);
      supplierId = supplierId ?? po.supplierId;
      if (po.warehouseId !== warehouseId) {
        throw new ConflictException('Warehouse does not match purchase order warehouse');
      }
    }

    const receivedByUserId = req.user?.id ?? '00000000-0000-0000-0000-000000000000';

    return this.prisma.$transaction(async (tx) => {
      const receiptNo = await this.generateReceiptNo(tx);
      const receipt = await tx.goodsReceipt.create({
        data: {
          receiptNo,
          purchaseOrderId: dto.purchaseOrderId,
          supplierId,
          warehouseId,
          branchId,
          receivedByUserId,
          status: GoodsReceiptStatus.DRAFT,
          receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : null,
          note: dto.note,
        },
      });

      for (const item of dto.items) {
        this.validateItemDates(item.manufactureDate, item.expiryDate);

        let batchId = item.batchId;
        if (batchId) {
          const batch = await tx.batch.findUnique({ where: { id: batchId } });
          if (!batch) throw new NotFoundException('Batch not found');
        } else {
          const existingBatch = await tx.batch.findUnique({
            where: { productId_batchNo: { productId: item.productId, batchNo: item.batchNo } },
          });
          if (existingBatch) {
            batchId = existingBatch.id;
          } else {
            const createdBatch = await tx.batch.create({
              data: {
                productId: item.productId,
                batchNo: item.batchNo,
                manufactureDate: item.manufactureDate ? new Date(item.manufactureDate) : null,
                expiryDate: new Date(item.expiryDate),
                supplierId,
                status: BatchStatus.ACTIVE,
              },
            });
            batchId = createdBatch.id;
          }
        }

        await tx.goodsReceiptItem.create({
          data: {
            goodsReceiptId: receipt.id,
            productId: item.productId,
            batchId,
            batchNo: item.batchNo,
            expiryDate: new Date(item.expiryDate),
            manufactureDate: item.manufactureDate ? new Date(item.manufactureDate) : null,
            quantity: item.quantity,
            unitCost: item.unitCost,
          },
        });
      }

      // TODO: Post inventory and stock movements after receipt confirmation in inventory task.
      return this.findOne(receipt.id);
    });
  }

  async update(id: string, dto: UpdateGoodsReceiptDto) {
    const existing = await this.findOne(id);
    if (existing.status !== GoodsReceiptStatus.DRAFT) {
      throw new ConflictException('Goods receipt is not editable in current status');
    }

    const nextSupplierId = dto.supplierId ?? (existing.supplierId ?? undefined);
    const nextWarehouseId = dto.warehouseId ?? existing.warehouseId;
    const nextBranchId = dto.branchId ?? (existing.branchId ?? undefined);

    await this.warehousesService.findOne(nextWarehouseId);
    if (nextBranchId) await this.branchesService.findOne(nextBranchId);
    if (nextSupplierId) await this.suppliersService.findOne(nextSupplierId);
    if (dto.purchaseOrderId) await this.purchaseOrdersService.findOne(dto.purchaseOrderId);

    return this.prisma.$transaction(async (tx) => {
      await tx.goodsReceipt.update({
        where: { id },
        data: {
          supplierId: nextSupplierId,
          warehouseId: nextWarehouseId,
          branchId: nextBranchId,
          purchaseOrderId: dto.purchaseOrderId ?? existing.purchaseOrderId,
          receivedAt: dto.receivedAt !== undefined ? (dto.receivedAt ? new Date(dto.receivedAt) : null) : existing.receivedAt,
          note: dto.note !== undefined ? dto.note : existing.note,
        },
      });

      if (dto.items) {
        if (dto.items.length === 0) throw new BadRequestException('Empty goods receipt items');
        await tx.goodsReceiptItem.deleteMany({ where: { goodsReceiptId: id } });

        for (const item of dto.items) {
          this.validateItemDates(item.manufactureDate, item.expiryDate);
          let batchId = item.batchId;
          if (batchId) {
            const batch = await tx.batch.findUnique({ where: { id: batchId } });
            if (!batch) throw new NotFoundException('Batch not found');
          } else {
            const existingBatch = await tx.batch.findUnique({
              where: { productId_batchNo: { productId: item.productId, batchNo: item.batchNo } },
            });
            if (existingBatch) {
              batchId = existingBatch.id;
            } else {
              const createdBatch = await tx.batch.create({
                data: {
                  productId: item.productId,
                  batchNo: item.batchNo,
                  manufactureDate: item.manufactureDate ? new Date(item.manufactureDate) : null,
                  expiryDate: new Date(item.expiryDate),
                  supplierId: nextSupplierId,
                  status: BatchStatus.ACTIVE,
                },
              });
              batchId = createdBatch.id;
            }
          }

          await tx.goodsReceiptItem.create({
            data: {
              goodsReceiptId: id,
              productId: item.productId,
              batchId,
              batchNo: item.batchNo,
              expiryDate: new Date(item.expiryDate),
              manufactureDate: item.manufactureDate ? new Date(item.manufactureDate) : null,
              quantity: item.quantity,
              unitCost: item.unitCost,
            },
          });
        }
      }

      return this.findOne(id);
    });
  }

  async updateStatus(id: string, dto: UpdateGoodsReceiptStatusDto) {
    const receipt = await this.findOne(id);
    if (receipt.status === GoodsReceiptStatus.CANCELLED && dto.status !== GoodsReceiptStatus.CANCELLED) {
      throw new ConflictException('Cancelled goods receipt cannot transition');
    }
    if (receipt.status === GoodsReceiptStatus.RECEIVED && dto.status !== GoodsReceiptStatus.RECEIVED) {
      throw new ConflictException('Received goods receipt cannot transition backward');
    }

    return this.prisma.goodsReceipt.update({
      where: { id },
      data: {
        status: dto.status,
        receivedAt:
          dto.status === GoodsReceiptStatus.RECEIVED
            ? dto.receivedAt
              ? new Date(dto.receivedAt)
              : receipt.receivedAt ?? new Date()
            : receipt.receivedAt,
      },
    });
  }

  async remove(id: string) {
    const receipt = await this.findOne(id);
    if (receipt.status === GoodsReceiptStatus.RECEIVED) {
      throw new ConflictException('Received goods receipt cannot be deleted');
    }

    return this.prisma.goodsReceipt.update({ where: { id }, data: { status: GoodsReceiptStatus.CANCELLED } });
  }

  async postInventory(id: string, req: Request & { user?: { id?: string } }) {
    const receipt = await this.findOne(id);
    if (receipt.status !== GoodsReceiptStatus.RECEIVED) {
      throw new ConflictException('Goods receipt must be RECEIVED before posting inventory');
    }

    const posted = await this.prisma.stockMovement.findFirst({
      where: { referenceType: 'GOODS_RECEIPT', referenceId: receipt.id },
    });
    if (posted) {
      throw new ConflictException('Goods receipt already posted');
    }

    const createdByUserId = req.user?.id ?? receipt.receivedByUserId;

    return this.prisma.$transaction(async (tx) => {
      const items = await tx.goodsReceiptItem.findMany({
        where: { goodsReceiptId: receipt.id },
      });

      for (const item of items) {
        if (!item.batchId) throw new BadRequestException('Goods receipt item missing batchId');
        const batch = await tx.batch.findUnique({ where: { id: item.batchId } });
        if (!batch) throw new NotFoundException('Batch not found');

        const inventory = await tx.inventoryItem.findFirst({
          where: {
            productId: item.productId,
            batchId: item.batchId,
            warehouseId: receipt.warehouseId,
            locationId: null,
          },
        });

        const beforeQty = inventory?.quantityOnHand ?? 0;
        const afterQty = beforeQty + item.quantity;

        if (inventory) {
          if (afterQty < inventory.quantityReserved) {
            throw new BadRequestException('quantityAvailable cannot be negative');
          }

          await tx.inventoryItem.update({
            where: { id: inventory.id },
            data: {
              quantityOnHand: afterQty,
              quantityAvailable: afterQty - inventory.quantityReserved,
              unitCost: item.unitCost,
              expiryDate: item.expiryDate,
              branchId: receipt.branchId,
            },
          });
        } else {
          await tx.inventoryItem.create({
            data: {
              productId: item.productId,
              batchId: item.batchId,
              warehouseId: receipt.warehouseId,
              locationId: null,
              branchId: receipt.branchId,
              quantityOnHand: item.quantity,
              quantityReserved: 0,
              quantityAvailable: item.quantity,
              unitCost: item.unitCost,
              expiryDate: item.expiryDate,
            },
          });
        }

        await tx.stockMovement.create({
          data: {
            tenantId: '00000000-0000-0000-0000-000000000000',
            productId: item.productId,
            warehouseId: receipt.warehouseId,
            movementType: InventoryMovementType.INCREASE,
            quantity: item.quantity,
            beforeQuantity: beforeQty,
            afterQuantity: afterQty,
            referenceType: 'GOODS_RECEIPT',
            referenceId: receipt.id,
            createdByUserId,
          },
        });
      }

      return { goodsReceiptId: receipt.id, posted: true, itemCount: items.length };
    });
  }

  private validateItemDates(manufactureDate: string | undefined, expiryDate: string) {
    if (!expiryDate) throw new BadRequestException('expiryDate is required');
    if (manufactureDate && new Date(manufactureDate) >= new Date(expiryDate)) {
      throw new BadRequestException('manufactureDate must be before expiryDate');
    }
  }

  private async generateReceiptNo(tx: Prisma.TransactionClient): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const rand = Math.floor(100000 + Math.random() * 900000);
      const receiptNo = `GR-${y}${m}${d}-${rand}`;
      const exists = await tx.goodsReceipt.findUnique({ where: { receiptNo } });
      if (!exists) return receiptNo;
    }
    throw new BadRequestException('Failed to generate receipt number');
  }

  private getHeader(req: Request, key: string): string | undefined {
    const value = req.headers[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
    return undefined;
  }
}
