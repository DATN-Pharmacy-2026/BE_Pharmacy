import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '.prisma/client/operation';
import { Request } from 'express';
import { OperationPrismaService } from '../../prisma/operation-prisma.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { QueryReceiptsDto } from './dto/query-receipts.dto';
import { VoidReceiptDto } from './dto/void-receipt.dto';

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: OperationPrismaService) {}

  private mapReceiptListItem(
    receipt: {
      id: string;
      receiptNo: string;
      posOrderId: string | null;
      issuedByUserId: string;
      totalAmount: Prisma.Decimal;
      issuedAt: Date;
      posOrder?: {
        id: string;
        orderNo: string;
        status: string;
        grandTotal: Prisma.Decimal;
      } | null;
    },
  ) {
    return {
      ...receipt,
      receiptCode: receipt.receiptNo,
      orderNo: receipt.posOrder?.orderNo ?? null,
      customerName: 'Khách lẻ',
      customerPhone: null,
      cashierName: null,
      paymentMethod: null,
      paymentStatus: null,
      grandTotal: Number(receipt.posOrder?.grandTotal ?? receipt.totalAmount ?? 0),
      createdAt: receipt.issuedAt,
    };
  }

  async findAll(query: QueryReceiptsDto) {
    const {
      page = 1,
      limit = 20,
      search,
      receiptNo,
      posOrderId,
      onlineOrderId,
      branchId,
      storeId,
      issuedByUserId,
      issuedDateFrom,
      issuedDateTo,
      dateFrom,
      dateTo,
    } = query;

    const where: Prisma.ReceiptWhereInput = {
      ...(receiptNo
        ? { receiptNo: { contains: receiptNo, mode: 'insensitive' } }
        : {}),
      ...(posOrderId ? { posOrderId } : {}),
      ...(onlineOrderId ? { onlineOrderId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(storeId ? { storeId } : {}),
      ...(issuedByUserId ? { issuedByUserId } : {}),
      ...(issuedDateFrom || issuedDateTo
        ? {
            issuedAt: {
              ...(issuedDateFrom ? { gte: new Date(issuedDateFrom) } : {}),
              ...(issuedDateTo ? { lte: new Date(issuedDateTo) } : {}),
            },
          }
        : {}),
      ...(dateFrom || dateTo
        ? {
            issuedAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { receiptNo: { contains: search, mode: 'insensitive' } },
              {
                posOrder: {
                  is: { orderNo: { contains: search, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.receipt.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { issuedAt: 'desc' },
        include: {
          posOrder: {
            select: { id: true, orderNo: true, status: true, grandTotal: true },
          },
          branch: { select: { id: true, code: true, name: true } },
          store: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.receipt.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapReceiptListItem(item)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id },
      include: {
        posOrder: {
          include: {
            items: true,
            payments: true,
            posTerminal: { select: { id: true, code: true, name: true } },
            posSession: {
              select: {
                id: true,
                openedAt: true,
                closedAt: true,
                status: true,
              },
            },
          },
        },
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
            phone: true,
            email: true,
          },
        },
        store: {
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
            phone: true,
          },
        },
      },
    });
    if (!receipt) throw new NotFoundException('receipt not found');
    return receipt;
  }

  async findByReceiptNo(receiptNo: string) {
    const receipt = await this.prisma.receipt.findUnique({
      where: { receiptNo },
    });
    if (!receipt) throw new NotFoundException('receipt not found');
    return this.findOne(receipt.id);
  }

  async findByPosOrder(posOrderId: string) {
    const receipt = await this.prisma.receipt.findFirst({
      where: { posOrderId },
    });
    if (!receipt) throw new NotFoundException('receipt not found');
    return this.findOne(receipt.id);
  }

  async findByOnlineOrder(onlineOrderId: string) {
    const receipts = await this.prisma.receipt.findMany({
      where: { onlineOrderId },
      orderBy: { issuedAt: 'desc' },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        store: { select: { id: true, code: true, name: true } },
      },
    });
    if (!receipts.length) throw new NotFoundException('receipt not found');
    return receipts;
  }

  async create(
    req: Request & { user?: { id?: string } },
    dto: CreateReceiptDto,
  ) {
    if (!dto.posOrderId && !dto.onlineOrderId) {
      throw new BadRequestException('posOrderId or onlineOrderId required');
    }

    if (dto.totalAmount < 0)
      throw new BadRequestException('totalAmount invalid');

    let posOrder = null as Awaited<
      ReturnType<typeof this.prisma.pOSOrder.findUnique>
    >;
    if (dto.posOrderId) {
      posOrder = await this.prisma.pOSOrder.findUnique({
        where: { id: dto.posOrderId },
      });
      if (!posOrder) throw new NotFoundException('POS order not found');

      const existing = await this.prisma.receipt.findFirst({
        where: { posOrderId: dto.posOrderId },
      });
      if (existing) return this.findOne(existing.id);
    }

    const branchId =
      dto.branchId ?? posOrder?.branchId ?? this.getHeader(req, 'x-branch-id');
    if (!branchId) throw new BadRequestException('branchId is required');

    const issuedByUserId =
      req.user?.id ??
      posOrder?.cashierUserId ??
      '00000000-0000-0000-0000-000000000000';

    const totalAmount = posOrder
      ? Number(posOrder.grandTotal)
      : dto.totalAmount;
    const issuedAt = dto.issuedAt ? new Date(dto.issuedAt) : new Date();

    const receiptNo = await this.generateReceiptNo();
    const receipt = await this.prisma.receipt.create({
      data: {
        receiptNo,
        posOrderId: dto.posOrderId,
        onlineOrderId: dto.onlineOrderId,
        branchId,
        storeId: dto.storeId ?? posOrder?.storeId,
        issuedByUserId,
        totalAmount,
        issuedAt,
      },
    });

    return this.findOne(receipt.id);
  }

  async createFromPosOrder(
    req: Request & { user?: { id?: string } },
    posOrderId: string,
  ) {
    const posOrder = await this.prisma.pOSOrder.findUnique({
      where: { id: posOrderId },
      include: { items: true, payments: true },
    });
    if (!posOrder) throw new NotFoundException('POS order not found');

    const existing = await this.prisma.receipt.findFirst({
      where: { posOrderId },
    });
    if (existing) return this.findOne(existing.id);

    const receiptNo = await this.generateReceiptNo();
    const receipt = await this.prisma.receipt.create({
      data: {
        receiptNo,
        posOrderId,
        onlineOrderId: null,
        branchId: posOrder.branchId,
        storeId: posOrder.storeId,
        issuedByUserId: req.user?.id ?? posOrder.cashierUserId,
        totalAmount: posOrder.grandTotal,
        issuedAt: new Date(),
      },
    });

    return this.findOne(receipt.id);
  }

  async createFromOnlineOrder(
    req: Request & { user?: { id?: string } },
    onlineOrderId: string,
    dto: CreateReceiptDto,
  ) {
    if (!dto.branchId && !this.getHeader(req, 'x-branch-id')) {
      throw new BadRequestException('branchId is required');
    }
    if (dto.totalAmount < 0)
      throw new BadRequestException('totalAmount invalid');

    const receiptNo = await this.generateReceiptNo();
    const receipt = await this.prisma.receipt.create({
      data: {
        receiptNo,
        posOrderId: null,
        onlineOrderId,
        branchId:
          dto.branchId ?? (this.getHeader(req, 'x-branch-id') as string),
        storeId: dto.storeId,
        issuedByUserId: req.user?.id ?? '00000000-0000-0000-0000-000000000000',
        totalAmount: dto.totalAmount,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : new Date(),
      },
    });

    return this.findOne(receipt.id);
  }

  async printData(id: string) {
    const receipt = await this.findOne(id);
    if (!receipt.posOrderId) {
      return {
        receipt,
        store: receipt.store,
        branch: receipt.branch,
        onlineOrderDetailUnavailable: true,
      };
    }

    return {
      receipt,
      store: receipt.store,
      branch: receipt.branch,
      posOrder: receipt.posOrder,
      items: receipt.posOrder?.items ?? [],
      payments: receipt.posOrder?.payments ?? [],
    };
  }

  async reissue(id: string) {
    const receipt = await this.findOne(id);
    return {
      receipt,
      reissued: true,
      reissuedAt: new Date().toISOString(),
    };
  }

  async void(id: string, dto: VoidReceiptDto) {
    await this.findOne(id);
    return {
      supported: false,
      message:
        'Receipt void requires status/audit model and is not persisted yet.',
      reason: dto.reason,
    };
  }

  private async generateReceiptNo(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const rand = Math.floor(100000 + Math.random() * 900000);
      const receiptNo = `RCT-${y}${m}${d}-${rand}`;
      const exists = await this.prisma.receipt.findUnique({
        where: { receiptNo },
      });
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
