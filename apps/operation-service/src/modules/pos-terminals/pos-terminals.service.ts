import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { POSTerminalStatus, Prisma } from '.prisma/client/operation';
import { BranchesService } from '../branches/branches.service';
import { StoresService } from '../stores/stores.service';
import { OperationPrismaService } from '../../prisma/operation-prisma.service';
import { CreatePosTerminalDto } from './dto/create-pos-terminal.dto';
import { QueryPosTerminalsDto } from './dto/query-pos-terminals.dto';
import { UpdatePosTerminalDto } from './dto/update-pos-terminal.dto';

@Injectable()
export class PosTerminalsService {
  constructor(
    private readonly prisma: OperationPrismaService,
    private readonly branchesService: BranchesService,
    private readonly storesService: StoresService,
  ) {}

  async findAll(query: QueryPosTerminalsDto) {
    const { page = 1, limit = 20, search, branchId, storeId, status } = query;
    const where: Prisma.POSTerminalWhereInput = {
      ...(branchId ? { branchId } : {}),
      ...(storeId ? { storeId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { deviceSerial: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.pOSTerminal.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          branch: { select: { id: true, code: true, name: true } },
          store: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.pOSTerminal.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const terminal = await this.prisma.pOSTerminal.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        store: { select: { id: true, code: true, name: true } },
      },
    });
    if (!terminal) throw new NotFoundException('POS terminal not found');
    return terminal;
  }

  async findByCode(code: string) {
    const terminal = await this.prisma.pOSTerminal.findUnique({
      where: { code },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        store: { select: { id: true, code: true, name: true } },
      },
    });
    if (!terminal) throw new NotFoundException('POS terminal not found');
    return terminal;
  }

  async create(dto: CreatePosTerminalDto) {
    await this.validateBranchAndStore(dto.branchId, dto.storeId);
    await this.ensureDeviceSerialAvailable(dto.deviceSerial);

    try {
      return await this.prisma.pOSTerminal.create({
        data: {
          ...dto,
          status: dto.status ?? POSTerminalStatus.ACTIVE,
        },
      });
    } catch (error) {
      this.handleUniqueError(error, 'Duplicate POS terminal code');
      throw error;
    }
  }

  async update(id: string, dto: UpdatePosTerminalDto) {
    const current = await this.findOne(id);

    const nextBranchId = dto.branchId ?? current.branchId;
    const nextStoreId = dto.storeId ?? current.storeId;
    await this.validateBranchAndStore(nextBranchId, nextStoreId);

    if (dto.deviceSerial && dto.deviceSerial !== current.deviceSerial) {
      await this.ensureDeviceSerialAvailable(dto.deviceSerial, id);
    }

    try {
      return await this.prisma.pOSTerminal.update({ where: { id }, data: dto });
    } catch (error) {
      this.handleUniqueError(error, 'Duplicate POS terminal code');
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.pOSTerminal.update({
      where: { id },
      data: { status: POSTerminalStatus.INACTIVE },
    });
  }

  private async validateBranchAndStore(branchId: string, storeId: string) {
    await this.branchesService.findOne(branchId);
    const store = await this.storesService.findOne(storeId);
    if (store.branchId !== branchId) {
      throw new ConflictException('Store does not belong to branch');
    }
  }

  private async ensureDeviceSerialAvailable(
    deviceSerial?: string,
    excludeId?: string,
  ) {
    if (!deviceSerial) return;
    const existing = await this.prisma.pOSTerminal.findFirst({
      where: {
        deviceSerial,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (existing) throw new ConflictException('Duplicate device serial');
  }

  private handleUniqueError(error: unknown, message: string) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(message);
    }
  }
}
