import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  POSSessionStatus,
  Prisma,
  VerificationResult,
} from '.prisma/client/operation';
import { Request } from 'express';
import { OperationPrismaService } from '../../prisma/operation-prisma.service';
import { QueryBarcodeVerificationsDto } from './dto/query-barcode-verifications.dto';
import { VerifyBarcodeDto } from './dto/verify-barcode.dto';
import { VerifyPosSaleDto } from './dto/verify-pos-sale.dto';
import { VerifyProductAvailabilityDto } from './dto/verify-product-availability.dto';

@Injectable()
export class VerificationService {
  constructor(private readonly prisma: OperationPrismaService) {}

  async verifyBarcode(
    req: Request & { user?: { id?: string } },
    dto: VerifyBarcodeDto,
  ) {
    const branchIdFromHeader = this.getHeader(req, 'x-branch-id');

    if (!dto.productId && !dto.batchId) {
      return {
        result: 'WARNING',
        reason:
          'Barcode belongs to catalog domain. Provide productId or batchId for operation-side verification.',
        barcode: dto.barcode,
        productId: dto.productId,
        batchId: dto.batchId,
        warehouseId: dto.warehouseId,
      };
    }

    if (dto.branchId) {
      await this.assertBranch(dto.branchId);
    }

    let warehouse: { id: string; branchId: string | null } | null = null;
    if (dto.warehouseId) {
      warehouse = await this.prisma.warehouse.findUnique({
        where: { id: dto.warehouseId },
        select: { id: true, branchId: true },
      });
      if (!warehouse) throw new NotFoundException('warehouse not found');
    }

    let batch: { id: string; productId: string; expiryDate: Date } | null =
      null;
    if (dto.batchId) {
      batch = await this.prisma.batch.findUnique({
        where: { id: dto.batchId },
        select: { id: true, productId: true, expiryDate: true },
      });
      if (!batch) {
        await this.persistVerification(
          req,
          dto,
          VerificationResult.NOT_FOUND,
          dto.branchId ??
            branchIdFromHeader ??
            warehouse?.branchId ??
            undefined,
        );
        return {
          result: 'FAILED',
          reason: 'Batch not found.',
          barcode: dto.barcode,
          productId: dto.productId,
          batchId: dto.batchId,
          warehouseId: dto.warehouseId,
        };
      }
      if (dto.productId && batch.productId !== dto.productId) {
        await this.persistVerification(
          req,
          dto,
          VerificationResult.INVALID,
          dto.branchId ??
            branchIdFromHeader ??
            warehouse?.branchId ??
            undefined,
          batch.id,
        );
        return {
          result: 'FAILED',
          reason: 'Batch does not match provided productId.',
          barcode: dto.barcode,
          productId: dto.productId,
          batchId: dto.batchId,
          warehouseId: dto.warehouseId,
        };
      }
      if (batch.expiryDate < new Date()) {
        await this.persistVerification(
          req,
          dto,
          VerificationResult.EXPIRED,
          dto.branchId ??
            branchIdFromHeader ??
            warehouse?.branchId ??
            undefined,
          batch.id,
        );
        return {
          result: 'FAILED',
          reason: 'Batch is expired.',
          barcode: dto.barcode,
          productId: dto.productId ?? batch.productId,
          batchId: dto.batchId,
          warehouseId: dto.warehouseId,
        };
      }
    }

    const resolvedProductId = dto.productId ?? batch?.productId;
    if (!resolvedProductId) {
      return {
        result: 'WARNING',
        reason: 'Unable to resolve productId for operation-side verification.',
        barcode: dto.barcode,
        productId: dto.productId,
        batchId: dto.batchId,
        warehouseId: dto.warehouseId,
      };
    }

    if (dto.warehouseId) {
      const inventory = await this.prisma.inventoryItem.findFirst({
        where: {
          warehouseId: dto.warehouseId,
          productId: resolvedProductId,
          ...(dto.batchId ? { batchId: dto.batchId } : {}),
        },
      });
      if (!inventory) {
        await this.persistVerification(
          req,
          dto,
          VerificationResult.NOT_FOUND,
          dto.branchId ??
            branchIdFromHeader ??
            warehouse?.branchId ??
            undefined,
          dto.batchId,
        );
        return {
          result: 'FAILED',
          reason: 'Inventory item not found for warehouse/product context.',
          barcode: dto.barcode,
          productId: resolvedProductId,
          batchId: dto.batchId,
          warehouseId: dto.warehouseId,
        };
      }
    }

    await this.persistVerification(
      req,
      dto,
      VerificationResult.VALID,
      dto.branchId ?? branchIdFromHeader ?? warehouse?.branchId ?? undefined,
      dto.batchId,
    );
    return {
      result: 'VERIFIED',
      reason: 'Operation-side checks passed.',
      barcode: dto.barcode,
      productId: resolvedProductId,
      batchId: dto.batchId,
      warehouseId: dto.warehouseId,
    };
  }

  async verifyProductAvailability(dto: VerifyProductAvailabilityDto) {
    await this.assertWarehouse(dto.warehouseId);
    if (dto.branchId) await this.assertBranch(dto.branchId);

    const rows = await this.prisma.inventoryItem.findMany({
      where: {
        productId: dto.productId,
        warehouseId: dto.warehouseId,
        ...(dto.branchId ? { branchId: dto.branchId } : {}),
        quantityAvailable: { gt: 0 },
        ...((dto.excludeExpired ?? true)
          ? { expiryDate: { gte: new Date() } }
          : {}),
      },
      orderBy: [{ expiryDate: 'asc' }, { updatedAt: 'asc' }],
    });

    const availableQty = rows.reduce((sum, r) => sum + r.quantityAvailable, 0);
    const shortageQty = Math.max(0, dto.quantity - availableQty);

    return {
      available: availableQty >= dto.quantity,
      requestedQty: dto.quantity,
      availableQty,
      shortageQty,
      earliestExpiryDate: rows[0]?.expiryDate ?? null,
      batches: rows.map((r) => ({
        batchId: r.batchId,
        expiryDate: r.expiryDate,
        quantityAvailable: r.quantityAvailable,
      })),
    };
  }

  async verifyPosSale(dto: VerifyPosSaleDto) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('branch not found');

    const store = await this.prisma.store.findUnique({
      where: { id: dto.storeId },
    });
    if (!store) throw new NotFoundException('store not found');
    if (store.branchId !== dto.branchId)
      throw new BadRequestException('Store does not belong to branch');

    const terminal = await this.prisma.pOSTerminal.findUnique({
      where: { id: dto.posTerminalId },
    });
    if (!terminal) throw new NotFoundException('POS terminal not found');
    if (
      terminal.branchId !== dto.branchId ||
      terminal.storeId !== dto.storeId
    ) {
      throw new BadRequestException(
        'POS terminal does not belong to branch/store',
      );
    }

    if (dto.posSessionId) {
      const session = await this.prisma.pOSSession.findUnique({
        where: { id: dto.posSessionId },
      });
      if (!session) throw new NotFoundException('POS session not found');
      if (session.status !== POSSessionStatus.OPEN)
        throw new BadRequestException('invalid POS session/order state');
      if (
        session.branchId !== dto.branchId ||
        session.storeId !== dto.storeId ||
        session.posTerminalId !== dto.posTerminalId
      ) {
        throw new BadRequestException('POS session context mismatch');
      }
    }

    await this.assertWarehouse(dto.warehouseId);

    const itemResults: Array<{
      productId: string;
      batchId?: string;
      requestedQty: number;
      availableQty: number;
      ready: boolean;
      reason: string;
      allocations?: Array<{ batchId: string; qty: number; expiryDate: Date }>;
    }> = [];

    for (const item of dto.items) {
      if (item.batchId) {
        const inventory = await this.prisma.inventoryItem.findFirst({
          where: {
            productId: item.productId,
            batchId: item.batchId,
            warehouseId: dto.warehouseId,
            quantityAvailable: { gt: 0 },
            expiryDate: { gte: new Date() },
          },
        });

        const availableQty = inventory?.quantityAvailable ?? 0;
        itemResults.push({
          productId: item.productId,
          batchId: item.batchId,
          requestedQty: item.quantity,
          availableQty,
          ready: availableQty >= item.quantity,
          reason:
            availableQty >= item.quantity
              ? 'Batch inventory is sufficient.'
              : 'Insufficient inventory for specified batch.',
        });
        continue;
      }

      const rows = await this.prisma.inventoryItem.findMany({
        where: {
          productId: item.productId,
          warehouseId: dto.warehouseId,
          quantityAvailable: { gt: 0 },
          expiryDate: { gte: new Date() },
        },
        orderBy: [{ expiryDate: 'asc' }, { updatedAt: 'asc' }],
      });

      let remaining = item.quantity;
      const allocations: Array<{
        batchId: string;
        qty: number;
        expiryDate: Date;
      }> = [];
      for (const row of rows) {
        if (remaining <= 0) break;
        const qty = Math.min(remaining, row.quantityAvailable);
        if (qty > 0) {
          allocations.push({
            batchId: row.batchId,
            qty,
            expiryDate: row.expiryDate,
          });
          remaining -= qty;
        }
      }

      const availableQty = rows.reduce(
        (sum, r) => sum + r.quantityAvailable,
        0,
      );
      itemResults.push({
        productId: item.productId,
        requestedQty: item.quantity,
        availableQty,
        ready: remaining === 0,
        reason:
          remaining === 0
            ? 'FEFO can satisfy requested quantity.'
            : 'Insufficient inventory for FEFO allocation.',
        allocations,
      });
    }

    const ready = itemResults.every((r) => r.ready);
    return {
      ready,
      reasons: itemResults.filter((r) => !r.ready).map((r) => r.reason),
      items: itemResults,
    };
  }

  async history(query: QueryBarcodeVerificationsDto) {
    const {
      page = 1,
      limit = 20,
      barcode,
      productId,
      batchId,
      branchId,
      warehouseId,
      scannedByUserId,
      result,
      dateFrom,
      dateTo,
    } = query;
    const where: Prisma.BarcodeVerificationWhereInput = {
      ...(barcode
        ? { barcode: { contains: barcode, mode: 'insensitive' } }
        : {}),
      ...(productId ? { productId } : {}),
      ...(batchId ? { batchId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(scannedByUserId ? { verifiedByUserId: scannedByUserId } : {}),
      ...(result ? { result } : {}),
      ...(dateFrom || dateTo
        ? {
            verifiedAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.barcodeVerification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { verifiedAt: 'desc' },
      }),
      this.prisma.barcodeVerification.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async historyById(id: string) {
    const row = await this.prisma.barcodeVerification.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('verification history not found');
    return row;
  }

  private async persistVerification(
    req: Request & { user?: { id?: string } },
    dto: VerifyBarcodeDto,
    result: VerificationResult,
    branchId?: string,
    batchId?: string,
  ) {
    if (!branchId) return;

    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null },
    });
    if (!branch) return;

    await this.prisma.barcodeVerification.create({
      data: {
        barcode: dto.barcode,
        productId: dto.productId,
        batchId: batchId ?? dto.batchId,
        branchId,
        storeId: null,
        warehouseId: dto.warehouseId,
        result,
        verifiedByUserId:
          req.user?.id ?? '00000000-0000-0000-0000-000000000000',
        verifiedAt: new Date(),
      },
    });
  }

  private async assertWarehouse(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) throw new NotFoundException('warehouse not found');
  }

  private async assertBranch(id: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('branch not found');
  }

  private getHeader(req: Request, key: string): string | undefined {
    const value = req.headers[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
    return undefined;
  }
}
