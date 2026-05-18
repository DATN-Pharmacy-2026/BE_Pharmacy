import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BranchStatus, Prisma } from '.prisma/client/operation';
import { CompaniesService } from '../companies/companies.service';
import { OperationPrismaService } from '../../prisma/operation-prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { QueryBranchesDto } from './dto/query-branches.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: OperationPrismaService,
    private readonly companiesService: CompaniesService,
  ) {}

  async findAll(query: QueryBranchesDto) {
    const {
      page = 1,
      limit = 20,
      search,
      companyId,
      status,
      province,
      district,
    } = query;
    const where: Prisma.BranchWhereInput = {
      deletedAt: null,
      ...(companyId ? { companyId } : {}),
      ...(status ? { status } : {}),
      ...(province
        ? { province: { contains: province, mode: 'insensitive' } }
        : {}),
      ...(district
        ? { district: { contains: district, mode: 'insensitive' } }
        : {}),
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
      this.prisma.branch.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { company: { select: { id: true, name: true } } },
      }),
      this.prisma.branch.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, deletedAt: null },
      include: { company: { select: { id: true, name: true } } },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async findByCode(code: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { code, deletedAt: null },
      include: { company: { select: { id: true, name: true } } },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async create(dto: CreateBranchDto) {
    await this.companiesService.findOne(dto.companyId);
    try {
      return await this.prisma.branch.create({
        data: { ...dto, status: dto.status ?? BranchStatus.ACTIVE },
      });
    } catch (error) {
      this.handleUniqueError(error, 'Duplicate branch code');
      throw error;
    }
  }

  async update(id: string, dto: UpdateBranchDto) {
    await this.findOne(id);
    if (dto.companyId) await this.companiesService.findOne(dto.companyId);
    try {
      return await this.prisma.branch.update({ where: { id }, data: dto });
    } catch (error) {
      this.handleUniqueError(error, 'Duplicate branch code');
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date(), status: BranchStatus.INACTIVE },
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
