import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentMethod,
  PaymentStatus,
  POSSessionStatus,
  Prisma,
} from '.prisma/client/operation';
import { Request } from 'express';
import { OperationPrismaService } from '../../prisma/operation-prisma.service';
import { ClosePosSessionDto } from './dto/close-pos-session.dto';
import { OpenPosSessionDto } from './dto/open-pos-session.dto';
import { QueryPosSessionsDto } from './dto/query-pos-sessions.dto';

@Injectable()
export class PosSessionsService {
  constructor(private readonly prisma: OperationPrismaService) {}

  async findAll(query: QueryPosSessionsDto) {
    const {
      page = 1,
      limit = 20,
      branchId,
      storeId,
      posTerminalId,
      cashierUserId,
      status,
      dateFrom,
      dateTo,
    } = query;
    const where: Prisma.POSSessionWhereInput = {
      ...(branchId ? { branchId } : {}),
      ...(storeId ? { storeId } : {}),
      ...(posTerminalId ? { posTerminalId } : {}),
      ...(cashierUserId ? { cashierUserId } : {}),
      ...(status ? { status } : {}),
      ...(dateFrom || dateTo
        ? {
            openedAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.pOSSession.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { openedAt: 'desc' },
        include: {
          branch: { select: { id: true, code: true, name: true } },
          store: { select: { id: true, code: true, name: true } },
          posTerminal: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.pOSSession.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const session = await this.prisma.pOSSession.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        store: { select: { id: true, code: true, name: true } },
        posTerminal: { select: { id: true, code: true, name: true } },
      },
    });
    if (!session) throw new NotFoundException('POS session not found');
    return session;
  }

  async current(
    req: Request & { user?: { id?: string } },
    query: { branchId?: string; storeId?: string; posTerminalId?: string },
  ) {
    const cashierUserId = this.getUserId(req.user?.id);
    const branchId = query.branchId ?? this.getHeader(req, 'x-branch-id');

    const session = await this.prisma.pOSSession.findFirst({
      where: {
        cashierUserId,
        status: POSSessionStatus.OPEN,
        ...(branchId ? { branchId } : {}),
        ...(query.storeId ? { storeId: query.storeId } : {}),
        ...(query.posTerminalId ? { posTerminalId: query.posTerminalId } : {}),
      },
      orderBy: { openedAt: 'desc' },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        store: { select: { id: true, code: true, name: true } },
        posTerminal: { select: { id: true, code: true, name: true } },
      },
    });

    if (!session) throw new NotFoundException('POS session not found');
    return session;
  }

  async open(
    req: Request & { user?: { id?: string } },
    dto: OpenPosSessionDto,
  ) {
    await this.validateContext(dto.branchId, dto.storeId, dto.posTerminalId);

    const cashierUserId = this.getUserId(req.user?.id);
    const duplicate = await this.prisma.pOSSession.findFirst({
      where: {
        cashierUserId,
        posTerminalId: dto.posTerminalId,
        status: POSSessionStatus.OPEN,
      },
    });
    if (duplicate) throw new ConflictException('POS session already open');

    const session = await this.prisma.pOSSession.create({
      data: {
        branchId: dto.branchId,
        storeId: dto.storeId,
        posTerminalId: dto.posTerminalId,
        cashierUserId,
        openingCash: dto.openingCash ?? 0,
        openedAt: new Date(),
        status: POSSessionStatus.OPEN,
      },
    });

    return this.findOne(session.id);
  }

  async close(id: string, dto: ClosePosSessionDto) {
    const session = await this.findOne(id);
    if (session.status !== POSSessionStatus.OPEN)
      throw new ConflictException('POS session already closed');
    if (dto.closingCash < 0)
      throw new BadRequestException('quantity cannot be negative');

    await this.prisma.pOSSession.update({
      where: { id },
      data: {
        closingCash: dto.closingCash,
        closedAt: new Date(),
        status: POSSessionStatus.CLOSED,
      },
    });

    const [allPaid, cashPaid, cashRefunded] = await this.prisma.$transaction([
      this.prisma.pOSPayment.aggregate({
        where: {
          status: PaymentStatus.PAID,
          posOrder: { posSessionId: id },
        },
        _sum: { amount: true },
      }),
      this.prisma.pOSPayment.aggregate({
        where: {
          status: PaymentStatus.PAID,
          method: PaymentMethod.CASH,
          posOrder: { posSessionId: id },
        },
        _sum: { amount: true },
      }),
      this.prisma.pOSPayment.aggregate({
        where: {
          status: PaymentStatus.REFUNDED,
          method: PaymentMethod.CASH,
          posOrder: { posSessionId: id },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalSales = Number(allPaid._sum.amount ?? 0);
    const cashSales = Number(cashPaid._sum.amount ?? 0);
    const cashRefund = Number(cashRefunded._sum.amount ?? 0);
    const expectedCash = Number(session.openingCash) + cashSales - cashRefund;
    const actualCash = dto.closingCash;
    const difference = actualCash - expectedCash;

    const closedSession = await this.findOne(id);
    return {
      ...closedSession,
      reconciliation: {
        totalSales,
        expectedCash,
        actualCash,
        difference,
        cashSales,
        cashRefund,
      },
    };
  }

  private async validateContext(
    branchId: string,
    storeId: string,
    posTerminalId: string,
  ) {
    const [branch, store, terminal] = await this.prisma.$transaction([
      this.prisma.branch.findFirst({
        where: { id: branchId, deletedAt: null },
      }),
      this.prisma.store.findUnique({ where: { id: storeId } }),
      this.prisma.pOSTerminal.findUnique({ where: { id: posTerminalId } }),
    ]);

    if (!branch) throw new NotFoundException('Branch not found');
    if (!store) throw new NotFoundException('Store not found');
    if (!terminal) throw new NotFoundException('POS terminal not found');
    if (store.branchId !== branchId)
      throw new ConflictException('Store does not belong to branch');
    if (terminal.branchId !== branchId || terminal.storeId !== storeId) {
      throw new ConflictException(
        'POS terminal does not belong to branch/store',
      );
    }
  }

  private getUserId(userId?: string) {
    // TODO: replace fallback when auth extraction is enforced in operation-service.
    return userId ?? '00000000-0000-0000-0000-000000000000';
  }

  private getHeader(req: Request, key: string): string | undefined {
    const value = req.headers[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
    return undefined;
  }
}
