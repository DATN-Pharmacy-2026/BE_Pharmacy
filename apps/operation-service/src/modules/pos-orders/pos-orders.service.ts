import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AllocationOrderType, AllocationStatus, InventoryMovementType, PaymentStatus, POSOrderStatus, POSSessionStatus, POSTerminalStatus, Prisma, StoreStatus } from '.prisma/client/operation';
import { Request } from 'express';
import { OperationPrismaService } from '../../prisma/operation-prisma.service';
import { CreatePosOrderDto } from './dto/create-pos-order.dto';
import { QueryPosOrdersDto } from './dto/query-pos-orders.dto';
import { RefundPosOrderDto } from './dto/refund-pos-order.dto';
import { UpdatePosOrderStatusDto } from './dto/update-pos-order-status.dto';

@Injectable()
export class PosOrdersService {
  constructor(private readonly prisma: OperationPrismaService) {}

  async findAll(query: QueryPosOrdersDto) {
    const { page = 1, limit = 20, search, orderNo, branchId, storeId, posTerminalId, posSessionId, cashierUserId, customerUserId, status, dateFrom, dateTo } = query;
    const where: Prisma.POSOrderWhereInput = {
      ...(orderNo ? { orderNo: { contains: orderNo, mode: 'insensitive' } } : {}),
      ...(branchId ? { branchId } : {}),
      ...(storeId ? { storeId } : {}),
      ...(posTerminalId ? { posTerminalId } : {}),
      ...(posSessionId ? { posSessionId } : {}),
      ...(cashierUserId ? { cashierUserId } : {}),
      ...(customerUserId ? { customerUserId } : {}),
      ...(status ? { status } : {}),
      ...((dateFrom || dateTo) ? { createdAt: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), ...(dateTo ? { lte: new Date(dateTo) } : {}) } } : {}),
      ...(search
        ? {
            OR: [
              { orderNo: { contains: search, mode: 'insensitive' } },
              { items: { some: { sku: { contains: search, mode: 'insensitive' } } } },
              { items: { some: { productNameSnapshot: { contains: search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.pOSOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { items: true } },
          payments: { select: { id: true, method: true, amount: true, status: true, paidAt: true } },
        },
      }),
      this.prisma.pOSOrder.count({ where }),
    ]);

    return {
      items: items.map((order) => ({ ...order, itemCount: order._count.items })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const order = await this.prisma.pOSOrder.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
        branch: { select: { id: true, code: true, name: true } },
        store: { select: { id: true, code: true, name: true } },
        posTerminal: { select: { id: true, code: true, name: true } },
        posSession: { select: { id: true, openedAt: true, closedAt: true, status: true } },
      },
    });
    if (!order) throw new NotFoundException('POS order not found');
    return order;
  }

  async findByOrderNo(orderNo: string) {
    const order = await this.prisma.pOSOrder.findUnique({ where: { orderNo } });
    if (!order) throw new NotFoundException('POS order not found');
    return this.findOne(order.id);
  }

  async findBySession(posSessionId: string) {
    return this.prisma.pOSOrder.findMany({ where: { posSessionId }, orderBy: { createdAt: 'desc' }, include: { items: true, payments: true } });
  }

  async create(req: Request & { user?: { id?: string } }, dto: CreatePosOrderDto) {
    const resolved = await this.resolvePosContext(req, dto);
    await this.validateContext(resolved.branchId, resolved.storeId, resolved.posTerminalId, resolved.posSessionId, resolved.warehouseId);
    if (!dto.items.length) throw new BadRequestException('Empty POS order items');

    const session = await this.prisma.pOSSession.findUnique({ where: { id: resolved.posSessionId } });
    if (!session) throw new NotFoundException('POS session not found');
    if (session.status !== POSSessionStatus.OPEN) throw new ConflictException('POS session already closed');

    const cashierUserId = req.user?.id ?? session.cashierUserId;
    const requestedDiscountTotal = dto.discountTotal ?? 0;
    const requestedTaxTotal = dto.taxTotal ?? 0;

    const subtotal = dto.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const lineDiscountTotal = dto.items.reduce((sum, item) => sum + (item.discountAmount ?? 0), 0);
    const discountTotal = requestedDiscountTotal + lineDiscountTotal;
    const grandTotal = subtotal - discountTotal + requestedTaxTotal;
    if (grandTotal < 0) throw new BadRequestException('payment amount invalid');

    const amountPaid = dto.amountPaid ?? grandTotal;
    if (amountPaid < 0) throw new BadRequestException('payment amount invalid');

    return this.prisma.$transaction(async (tx) => {
      const orderNo = await this.generateOrderNo(tx);

      const order = await tx.pOSOrder.create({
        data: {
          orderNo,
          branchId: resolved.branchId,
          storeId: resolved.storeId,
          posTerminalId: resolved.posTerminalId,
          posSessionId: resolved.posSessionId,
          cashierUserId,
          customerUserId: dto.customerUserId,
          status: amountPaid >= grandTotal ? POSOrderStatus.COMPLETED : POSOrderStatus.CREATED,
          subtotal,
          discountTotal,
          taxTotal: requestedTaxTotal,
          grandTotal,
        },
      });

      for (const inputItem of dto.items) {
        const itemDiscount = inputItem.discountAmount ?? 0;

        if (inputItem.batchId) {
          const batch = await tx.batch.findUnique({ where: { id: inputItem.batchId } });
          if (!batch) throw new NotFoundException('Batch not found');

          const inventory = await tx.inventoryItem.findFirst({
            where: {
              productId: inputItem.productId,
              batchId: inputItem.batchId,
              warehouseId: resolved.warehouseId,
            },
          });
          if (!inventory) throw new NotFoundException('inventory item not found');
          if (inventory.quantityAvailable < inputItem.quantity) throw new ConflictException('insufficient inventory');

          const beforeQty = inventory.quantityOnHand;
          const afterQty = beforeQty - inputItem.quantity;
          const afterAvailable = afterQty - inventory.quantityReserved;
          if (afterQty < 0 || afterAvailable < 0) throw new ConflictException('quantity cannot be negative');

          await tx.inventoryItem.update({
            where: { id: inventory.id },
            data: { quantityOnHand: afterQty, quantityAvailable: afterAvailable },
          });

          const item = await tx.pOSOrderItem.create({
            data: {
              posOrderId: order.id,
              productId: inputItem.productId,
              batchId: inputItem.batchId,
              sku: inputItem.sku,
              productNameSnapshot: inputItem.productNameSnapshot ?? inputItem.sku ?? inputItem.productId,
              quantity: inputItem.quantity,
              unitPrice: inputItem.unitPrice,
              discountAmount: itemDiscount,
              totalAmount: inputItem.quantity * inputItem.unitPrice - itemDiscount,
            },
          });

          await tx.stockMovement.create({
            data: {
              tenantId: '00000000-0000-0000-0000-000000000000',
              productId: inputItem.productId,
              warehouseId: resolved.warehouseId,
              movementType: InventoryMovementType.SALE_DECREASE,
              quantity: inputItem.quantity,
              beforeQuantity: beforeQty,
              afterQuantity: afterQty,
              referenceType: 'POS_ORDER',
              referenceId: order.id,
              createdByUserId: cashierUserId,
            },
          });

          await tx.fEFOAllocation.create({
            data: {
              productId: inputItem.productId,
              orderType: AllocationOrderType.POS_ORDER,
              orderId: order.id,
              orderItemId: item.id,
              warehouseId: resolved.warehouseId,
              branchId: resolved.branchId,
              batchId: inputItem.batchId,
              expiryDate: inventory.expiryDate,
              allocatedQty: inputItem.quantity,
              status: AllocationStatus.CONSUMED,
            },
          });

          continue;
        }

        let remaining = inputItem.quantity;
        const fefoInventories = await tx.inventoryItem.findMany({
          where: {
            productId: inputItem.productId,
            warehouseId: resolved.warehouseId,
            quantityAvailable: { gt: 0 },
            expiryDate: { gte: new Date() },
          },
          orderBy: [{ expiryDate: 'asc' }, { updatedAt: 'asc' }],
        });

        for (const inventory of fefoInventories) {
          if (remaining <= 0) break;

          const deductedQty = Math.min(remaining, inventory.quantityAvailable);
          const beforeQty = inventory.quantityOnHand;
          const afterQty = beforeQty - deductedQty;
          const afterAvailable = afterQty - inventory.quantityReserved;

          if (deductedQty <= 0) continue;
          if (afterQty < 0 || afterAvailable < 0) throw new ConflictException('quantity cannot be negative');

          await tx.inventoryItem.update({
            where: { id: inventory.id },
            data: {
              quantityOnHand: afterQty,
              quantityAvailable: afterAvailable,
            },
          });

          const ratioDiscount = itemDiscount * (deductedQty / inputItem.quantity);
          const item = await tx.pOSOrderItem.create({
            data: {
              posOrderId: order.id,
              productId: inputItem.productId,
              batchId: inventory.batchId,
              sku: inputItem.sku,
              productNameSnapshot: inputItem.productNameSnapshot ?? inputItem.sku ?? inputItem.productId,
              quantity: deductedQty,
              unitPrice: inputItem.unitPrice,
              discountAmount: ratioDiscount,
              totalAmount: deductedQty * inputItem.unitPrice - ratioDiscount,
            },
          });

          await tx.stockMovement.create({
            data: {
              tenantId: '00000000-0000-0000-0000-000000000000',
              productId: inputItem.productId,
              warehouseId: resolved.warehouseId,
              movementType: InventoryMovementType.SALE_DECREASE,
              quantity: deductedQty,
              beforeQuantity: beforeQty,
              afterQuantity: afterQty,
              referenceType: 'POS_ORDER',
              referenceId: order.id,
              createdByUserId: cashierUserId,
            },
          });

          await tx.fEFOAllocation.create({
            data: {
              productId: inputItem.productId,
              orderType: AllocationOrderType.POS_ORDER,
              orderId: order.id,
              orderItemId: item.id,
              warehouseId: resolved.warehouseId,
              branchId: resolved.branchId,
              batchId: inventory.batchId,
              expiryDate: inventory.expiryDate,
              allocatedQty: deductedQty,
              status: AllocationStatus.CONSUMED,
            },
          });

          remaining -= deductedQty;
        }

        if (remaining > 0) throw new ConflictException('insufficient inventory');
      }

      await tx.pOSPayment.create({
        data: {
          posOrderId: order.id,
          method: dto.paymentMethod,
          amount: amountPaid,
          status: amountPaid >= grandTotal ? PaymentStatus.PAID : PaymentStatus.PENDING,
          paidAt: amountPaid >= grandTotal ? new Date() : null,
        },
      });

      return this.findOne(order.id);
    });
  }

  private async resolvePosContext(
    req: Request,
    dto: CreatePosOrderDto,
  ): Promise<{
    branchId: string;
    warehouseId: string;
    storeId: string;
    posTerminalId: string;
    posSessionId: string;
  }> {
    const headerBranchId = this.header(req, 'x-branch-id');
    const headerWarehouseId = this.header(req, 'x-warehouse-id');
    const branchId = dto.branchId ?? headerBranchId;
    const warehouseId = dto.warehouseId ?? headerWarehouseId;
    if (!branchId) throw new BadRequestException('branchId is required');
    if (!warehouseId) throw new BadRequestException('warehouseId is required');

    let storeId = dto.storeId;
    if (!storeId) {
      const store = await this.prisma.store.findFirst({
        where: { branchId, status: StoreStatus.ACTIVE },
        orderBy: { createdAt: 'asc' },
      });
      if (!store) throw new NotFoundException('Store not found');
      storeId = store.id;
    }

    let posTerminalId = dto.posTerminalId;
    if (!posTerminalId) {
      const terminal = await this.prisma.pOSTerminal.findFirst({
        where: { branchId, storeId, status: POSTerminalStatus.ACTIVE },
        orderBy: { createdAt: 'asc' },
      });
      if (!terminal) throw new NotFoundException('POS terminal not found');
      posTerminalId = terminal.id;
    }

    let posSessionId = dto.posSessionId;
    if (!posSessionId) {
      const session = await this.prisma.pOSSession.findFirst({
        where: { branchId, storeId, posTerminalId, status: POSSessionStatus.OPEN },
        orderBy: { openedAt: 'desc' },
      });
      if (!session) throw new NotFoundException('POS session not found');
      posSessionId = session.id;
    }

    dto.items = dto.items.map((item) => ({
      ...item,
      sku: item.sku ?? item.productId,
      productNameSnapshot: item.productNameSnapshot ?? item.sku ?? item.productId,
    }));

    return { branchId, warehouseId, storeId, posTerminalId, posSessionId };
  }

  private header(req: Request, key: string): string | undefined {
    const value = req.headers[key];
    return typeof value === 'string' && value.trim() ? value : undefined;
  }

  async updateStatus(id: string, dto: UpdatePosOrderStatusDto) {
    const order = await this.findOne(id);
    if (order.status === POSOrderStatus.REFUNDED && dto.status !== POSOrderStatus.REFUNDED) {
      throw new ConflictException('invalid POS order status transition');
    }
    return this.prisma.pOSOrder.update({ where: { id }, data: { status: dto.status } });
  }

  async refund(id: string, req: Request & { user?: { id?: string } }, dto: RefundPosOrderDto) {
    const order = await this.findOne(id);
    if (order.status !== POSOrderStatus.COMPLETED && order.status !== POSOrderStatus.CREATED) {
      throw new ConflictException('invalid POS order status transition');
    }
    const cashierUserId = req.user?.id ?? order.cashierUserId;

    return this.prisma.$transaction(async (tx) => {
      const items = await tx.pOSOrderItem.findMany({ where: { posOrderId: order.id } });
      const inputMap = new Map((dto.items ?? []).map((i) => [i.posOrderItemId, i.quantity]));

      for (const item of items) {
        const qty = inputMap.size > 0 ? (inputMap.get(item.id) ?? 0) : item.quantity;
        if (qty === 0) continue;
        if (qty < 0) throw new BadRequestException('quantity cannot be negative');
        if (qty > item.quantity) throw new BadRequestException('quantity cannot be negative');
        if (!item.batchId) continue;

        const inventory = await tx.inventoryItem.findFirst({
          where: { productId: item.productId, batchId: item.batchId, branchId: order.branchId },
        });
        if (!inventory) throw new NotFoundException('inventory item not found');

        const beforeQty = inventory.quantityOnHand;
        const afterQty = beforeQty + qty;
        const afterAvailable = afterQty - inventory.quantityReserved;

        await tx.inventoryItem.update({
          where: { id: inventory.id },
          data: { quantityOnHand: afterQty, quantityAvailable: afterAvailable },
        });

        await tx.stockMovement.create({
          data: {
            tenantId: '00000000-0000-0000-0000-000000000000',
            productId: item.productId,
            warehouseId: inventory.warehouseId,
            movementType: InventoryMovementType.INCREASE,
            quantity: qty,
            beforeQuantity: beforeQty,
            afterQuantity: afterQty,
            referenceType: 'POS_REFUND',
            referenceId: order.id,
            createdByUserId: cashierUserId,
            reason: dto.reason,
          },
        });
      }

      await tx.pOSOrder.update({ where: { id: order.id }, data: { status: POSOrderStatus.REFUNDED } });
      await tx.pOSPayment.updateMany({
        where: { posOrderId: order.id, status: { in: [PaymentStatus.PAID, PaymentStatus.PENDING] } },
        data: { status: PaymentStatus.REFUNDED },
      });

      return this.findOne(order.id);
    });
  }

  private async validateContext(branchId: string, storeId: string, posTerminalId: string, posSessionId: string, warehouseId: string) {
    const [branch, store, terminal, session, warehouse] = await this.prisma.$transaction([
      this.prisma.branch.findFirst({ where: { id: branchId, deletedAt: null } }),
      this.prisma.store.findUnique({ where: { id: storeId } }),
      this.prisma.pOSTerminal.findUnique({ where: { id: posTerminalId } }),
      this.prisma.pOSSession.findUnique({ where: { id: posSessionId } }),
      this.prisma.warehouse.findUnique({ where: { id: warehouseId } }),
    ]);

    if (!branch) throw new NotFoundException('branch not found');
    if (!store) throw new NotFoundException('store not found');
    if (!terminal) throw new NotFoundException('POS terminal not found');
    if (!session) throw new NotFoundException('POS session not found');
    if (!warehouse) throw new NotFoundException('warehouse not found');

    if (store.branchId !== branchId) throw new ConflictException('Store does not belong to branch');
    if (terminal.branchId !== branchId || terminal.storeId !== storeId) throw new ConflictException('POS terminal does not belong to branch/store');
    if (session.branchId !== branchId || session.storeId !== storeId || session.posTerminalId !== posTerminalId) {
      throw new ConflictException('POS session context mismatch');
    }
  }

  private async generateOrderNo(tx: Prisma.TransactionClient) {
    for (let i = 0; i < 5; i++) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const rand = Math.floor(100000 + Math.random() * 900000);
      const orderNo = `POS-${y}${m}${d}-${rand}`;
      const existing = await tx.pOSOrder.findUnique({ where: { orderNo } });
      if (!existing) return orderNo;
    }
    throw new BadRequestException('Failed to generate POS order number');
  }
}
