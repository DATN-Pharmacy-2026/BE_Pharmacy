import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PurchaseOrderStatus } from '.prisma/client/operation';
import { Request } from 'express';
import { BranchesService } from '../branches/branches.service';
import { OperationPrismaService } from '../../prisma/operation-prisma.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { QueryPurchaseOrdersDto } from './dto/query-purchase-orders.dto';
import { UpdatePurchaseOrderStatusDto } from './dto/update-purchase-order-status.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: OperationPrismaService,
    private readonly suppliersService: SuppliersService,
    private readonly warehousesService: WarehousesService,
    private readonly branchesService: BranchesService,
  ) {}

  async findAll(query: QueryPurchaseOrdersDto) {
    const {
      page = 1,
      limit = 20,
      search,
      supplierId,
      warehouseId,
      branchId,
      status,
      orderedByUserId,
      approvedByUserId,
      expectedDateFrom,
      expectedDateTo,
      dateFrom,
      dateTo,
    } = query;

    const where: Prisma.PurchaseOrderWhereInput = {
      ...(supplierId ? { supplierId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(status ? { status } : {}),
      ...(orderedByUserId ? { orderedByUserId } : {}),
      ...(approvedByUserId ? { approvedByUserId } : {}),
      ...(expectedDateFrom || expectedDateTo
        ? {
            expectedDate: {
              ...(expectedDateFrom ? { gte: new Date(expectedDateFrom) } : {}),
              ...(expectedDateTo ? { lte: new Date(expectedDateTo) } : {}),
            },
          }
        : {}),
      ...(dateFrom || dateTo
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
              { poNo: { contains: search, mode: 'insensitive' } },
              { supplier: { code: { contains: search, mode: 'insensitive' } } },
              { supplier: { name: { contains: search, mode: 'insensitive' } } },
              {
                items: {
                  some: {
                    productNameSnapshot: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, code: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      items: items.map((po) => ({
        ...po,
        itemCount: po._count.items,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, code: true, name: true } },
        items: true,
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async findByPoNo(poNo: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { poNo },
      include: {
        supplier: { select: { id: true, code: true, name: true } },
        items: true,
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async create(
    req: Request & { user?: { id?: string } },
    dto: CreatePurchaseOrderDto,
  ) {
    if (!dto.items?.length)
      throw new BadRequestException('Empty purchase order items');

    const warehouseId =
      dto.warehouseId ?? this.getHeader(req, 'x-warehouse-id');
    const branchId = dto.branchId ?? this.getHeader(req, 'x-branch-id');

    if (!warehouseId) throw new BadRequestException('warehouseId is required');

    await this.suppliersService.findOne(dto.supplierId);
    const warehouse = await this.warehousesService.findOne(warehouseId);
    if (branchId) await this.branchesService.findOne(branchId);

    if (branchId && warehouse.branchId && warehouse.branchId !== branchId) {
      throw new ConflictException(
        'Warehouse does not belong to provided branch',
      );
    }

    const orderedByUserId =
      req.user?.id ?? '00000000-0000-0000-0000-000000000000';
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0,
    );

    return this.prisma.$transaction(async (tx) => {
      const poNo = await this.generatePoNo(tx);
      const po = await tx.purchaseOrder.create({
        data: {
          poNo,
          supplierId: dto.supplierId,
          warehouseId,
          branchId,
          status: PurchaseOrderStatus.DRAFT,
          orderedByUserId,
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
          totalAmount,
        },
      });

      await tx.purchaseOrderItem.createMany({
        data: dto.items.map((item) => ({
          purchaseOrderId: po.id,
          productId: item.productId,
          sku: item.sku,
          productNameSnapshot: item.productNameSnapshot,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.quantity * item.unitCost,
        })),
      });

      const created = await tx.purchaseOrder.findUnique({
        where: { id: po.id },
        include: {
          supplier: { select: { id: true, code: true, name: true } },
          items: true,
        },
      });
      if (!created) throw new NotFoundException('Purchase order not found');
      return created;
    });
  }

  async update(id: string, dto: UpdatePurchaseOrderDto) {
    const existing = await this.findOne(id);
    if (
      existing.status !== PurchaseOrderStatus.DRAFT &&
      existing.status !== PurchaseOrderStatus.PENDING_APPROVAL
    ) {
      throw new ConflictException(
        'Purchase order is not editable in current status',
      );
    }

    const nextSupplierId = dto.supplierId ?? existing.supplierId;
    const nextWarehouseId = dto.warehouseId ?? existing.warehouseId;
    const nextBranchId = dto.branchId ?? existing.branchId ?? undefined;

    await this.suppliersService.findOne(nextSupplierId);
    const warehouse = await this.warehousesService.findOne(nextWarehouseId);
    if (nextBranchId) await this.branchesService.findOne(nextBranchId);
    if (
      nextBranchId &&
      warehouse.branchId &&
      warehouse.branchId !== nextBranchId
    ) {
      throw new ConflictException(
        'Warehouse does not belong to provided branch',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let totalAmount = Number(existing.totalAmount);
      if (dto.items) {
        if (dto.items.length === 0)
          throw new BadRequestException('Empty purchase order items');
        totalAmount = dto.items.reduce(
          (sum, item) => sum + item.quantity * item.unitCost,
          0,
        );

        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: id },
        });
        await tx.purchaseOrderItem.createMany({
          data: dto.items.map((item) => ({
            purchaseOrderId: id,
            productId: item.productId,
            sku: item.sku,
            productNameSnapshot: item.productNameSnapshot,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.quantity * item.unitCost,
          })),
        });
      }

      await tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId: nextSupplierId,
          warehouseId: nextWarehouseId,
          branchId: nextBranchId,
          expectedDate:
            dto.expectedDate !== undefined
              ? dto.expectedDate
                ? new Date(dto.expectedDate)
                : null
              : existing.expectedDate,
          totalAmount,
        },
      });

      return this.findOne(id);
    });
  }

  async updateStatus(
    id: string,
    req: Request & { user?: { id?: string } },
    dto: UpdatePurchaseOrderStatusDto,
  ) {
    const po = await this.findOne(id);
    if (
      po.status === PurchaseOrderStatus.CANCELLED &&
      dto.status !== PurchaseOrderStatus.CANCELLED
    ) {
      throw new ConflictException('Cancelled purchase order cannot transition');
    }
    if (
      po.status === PurchaseOrderStatus.RECEIVED &&
      dto.status !== PurchaseOrderStatus.RECEIVED
    ) {
      throw new ConflictException(
        'Received purchase order cannot transition backward',
      );
    }

    const approveStatuses = new Set<PurchaseOrderStatus>([
      PurchaseOrderStatus.APPROVED,
      PurchaseOrderStatus.PARTIALLY_RECEIVED,
      PurchaseOrderStatus.RECEIVED,
    ]);

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: dto.status,
        approvedByUserId: approveStatuses.has(dto.status)
          ? (req.user?.id ?? dto.approvedByUserId ?? po.approvedByUserId)
          : po.approvedByUserId,
      },
    });
  }

  async remove(id: string) {
    const po = await this.findOne(id);
    if (
      po.status === PurchaseOrderStatus.APPROVED ||
      po.status === PurchaseOrderStatus.PARTIALLY_RECEIVED ||
      po.status === PurchaseOrderStatus.RECEIVED
    ) {
      throw new ConflictException(
        'Approved/received purchase order cannot be deleted',
      );
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.CANCELLED },
    });
  }

  private async generatePoNo(tx: Prisma.TransactionClient): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const rand = Math.floor(100000 + Math.random() * 900000);
      const poNo = `PO-${y}${m}${d}-${rand}`;
      const exists = await tx.purchaseOrder.findUnique({ where: { poNo } });
      if (!exists) return poNo;
    }
    throw new BadRequestException('Failed to generate purchase order number');
  }

  private getHeader(req: Request, key: string): string | undefined {
    const value = req.headers[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
    return undefined;
  }
}
