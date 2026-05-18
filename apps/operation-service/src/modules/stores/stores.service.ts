import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StoreStatus } from '.prisma/client/operation';
import { BranchesService } from '../branches/branches.service';
import { OperationPrismaService } from '../../prisma/operation-prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { QueryStoresDto } from './dto/query-stores.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: OperationPrismaService,
    private readonly branchesService: BranchesService,
  ) {}

  async findAll(query: QueryStoresDto) {
    const { page = 1, limit = 20, search, branchId, status } = query;
    const where: Prisma.StoreWhereInput = {
      ...(branchId ? { branchId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { address: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.store.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { branch: { select: { id: true, code: true, name: true } } },
      }),
      this.prisma.store.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: { branch: { select: { id: true, code: true, name: true } } },
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async findByCode(code: string) {
    const store = await this.prisma.store.findUnique({
      where: { code },
      include: { branch: { select: { id: true, code: true, name: true } } },
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async create(dto: CreateStoreDto) {
    await this.branchesService.findOne(dto.branchId);
    try {
      return await this.prisma.store.create({
        data: { ...dto, status: dto.status ?? StoreStatus.ACTIVE },
      });
    } catch (error) {
      this.handleUniqueError(error, 'Duplicate store code');
      throw error;
    }
  }

  async update(id: string, dto: UpdateStoreDto) {
    await this.findOne(id);
    if (dto.branchId) await this.branchesService.findOne(dto.branchId);
    try {
      return await this.prisma.store.update({ where: { id }, data: dto });
    } catch (error) {
      this.handleUniqueError(error, 'Duplicate store code');
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.store.update({
      where: { id },
      data: { status: StoreStatus.INACTIVE },
    });
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
