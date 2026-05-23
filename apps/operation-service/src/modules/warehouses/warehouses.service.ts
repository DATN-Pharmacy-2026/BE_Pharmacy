import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LocationStatus,
  Prisma,
  WarehouseStatus,
  WarehouseType,
} from '.prisma/client/operation';
import { BranchesService } from '../branches/branches.service';
import { OperationPrismaService } from '../../prisma/operation-prisma.service';
import { CreateWarehouseLocationDto } from './dto/create-warehouse-location.dto';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { QueryWarehousesDto } from './dto/query-warehouses.dto';
import { UpdateWarehouseLocationDto } from './dto/update-warehouse-location.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(
    private readonly prisma: OperationPrismaService,
    private readonly branchesService: BranchesService,
  ) {}

  async findAll(query: QueryWarehousesDto) {
    const {
      page = 1,
      limit = 20,
      search,
      branchId,
      type,
      isCentral,
      status,
    } = query;
    const where: Prisma.WarehouseWhereInput = {
      ...(branchId ? { branchId } : {}),
      ...(type ? { type } : {}),
      ...(typeof isCentral === 'boolean' ? { isCentral } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { address: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.warehouse.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { branch: { select: { id: true, code: true, name: true } } },
      }),
      this.prisma.warehouse.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: { branch: { select: { id: true, code: true, name: true } } },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
  }

  async findByCode(code: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { code },
      include: { branch: { select: { id: true, code: true, name: true } } },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
  }

  async create(dto: CreateWarehouseDto) {
    if (dto.branchId) await this.branchesService.findOne(dto.branchId);
    const resolvedType =
      dto.type ??
      (dto.isCentral ? WarehouseType.CENTRAL : dto.branchId ? WarehouseType.BRANCH : WarehouseType.CENTRAL);
    try {
      return await this.prisma.warehouse.create({
        data: {
          ...dto,
          type: resolvedType,
          address: dto.address ?? dto.location,
          status:
            dto.status ??
            (dto.isActive === false
              ? WarehouseStatus.INACTIVE
              : WarehouseStatus.ACTIVE),
          isCentral: dto.isCentral ?? false,
        },
      });
    } catch (error) {
      this.handleUniqueError(error, 'Duplicate warehouse code');
      throw error;
    }
  }

  async update(id: string, dto: UpdateWarehouseDto) {
    await this.findOne(id);
    if (dto.branchId) await this.branchesService.findOne(dto.branchId);
    const status =
      dto.status ??
      (dto.isActive === undefined
        ? undefined
        : dto.isActive
          ? WarehouseStatus.ACTIVE
          : WarehouseStatus.INACTIVE);
    try {
      return await this.prisma.warehouse.update({
        where: { id },
        data: {
          ...dto,
          type: dto.type ?? undefined,
          address: dto.address ?? dto.location ?? undefined,
          status,
        },
      });
    } catch (error) {
      this.handleUniqueError(error, 'Duplicate warehouse code');
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.warehouse.update({
      where: { id },
      data: { status: WarehouseStatus.INACTIVE },
    });
  }

  async listLocations(warehouseId: string) {
    await this.findOne(warehouseId);
    return this.prisma.warehouseLocation.findMany({
      where: { warehouseId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findLocation(locationId: string) {
    const location = await this.prisma.warehouseLocation.findUnique({
      where: { id: locationId },
      include: { warehouse: { select: { id: true, code: true, name: true } } },
    });
    if (!location) throw new NotFoundException('Warehouse location not found');
    return location;
  }

  async createLocation(warehouseId: string, dto: CreateWarehouseLocationDto) {
    await this.findOne(warehouseId);
    try {
      return await this.prisma.warehouseLocation.create({
        data: {
          ...dto,
          warehouseId,
          status: dto.status ?? LocationStatus.ACTIVE,
        },
      });
    } catch (error) {
      this.handleUniqueError(error, 'Duplicate location code in warehouse');
      throw error;
    }
  }

  async updateLocation(locationId: string, dto: UpdateWarehouseLocationDto) {
    await this.findLocation(locationId);
    try {
      return await this.prisma.warehouseLocation.update({
        where: { id: locationId },
        data: dto,
      });
    } catch (error) {
      this.handleUniqueError(error, 'Duplicate location code in warehouse');
      throw error;
    }
  }

  async removeLocation(locationId: string) {
    await this.findLocation(locationId);
    return this.prisma.warehouseLocation.update({
      where: { id: locationId },
      data: { status: LocationStatus.INACTIVE },
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
