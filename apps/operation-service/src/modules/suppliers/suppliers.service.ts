import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SupplierStatus } from '.prisma/client/operation';
import { OperationPrismaService } from '../../prisma/operation-prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: OperationPrismaService) {}

  async findAll(query: QuerySuppliersDto) {
    const { page = 1, limit = 20, search, status, code, taxCode } = query;
    const where: Prisma.SupplierWhereInput = {
      ...(status ? { status } : {}),
      ...(code ? { code: { contains: code, mode: 'insensitive' } } : {}),
      ...(taxCode ? { taxCode: { contains: taxCode, mode: 'insensitive' } } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { taxCode: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async findByCode(code: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { code } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async create(dto: CreateSupplierDto) {
    try {
      return await this.prisma.supplier.create({
        data: { ...dto, status: dto.status ?? SupplierStatus.ACTIVE },
      });
    } catch (error) {
      this.handleUniqueError(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);
    try {
      return await this.prisma.supplier.update({ where: { id }, data: dto });
    } catch (error) {
      this.handleUniqueError(error);
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data: { status: SupplierStatus.INACTIVE } });
  }

  private handleUniqueError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : '';
      if (target.includes('code')) throw new ConflictException('Duplicate supplier code');
      if (target.includes('taxCode')) throw new ConflictException('Duplicate supplier taxCode');
      throw new ConflictException('Duplicate supplier value');
    }
  }
}
