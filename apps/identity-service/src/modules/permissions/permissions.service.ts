import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '.prisma/client/identity';
import { IdentityPrismaService } from '../../prisma/identity-prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { QueryPermissionsDto } from './dto/query-permissions.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: IdentityPrismaService) {}

  findAll(query: QueryPermissionsDto) {
    const where: Prisma.PermissionWhereInput = {
      ...(query.module ? { module: query.module } : {}),
      ...(query.action ? { action: query.action } : {}),
    };

    return this.prisma.permission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    return permission;
  }

  async create(dto: CreatePermissionDto) {
    const existing = await this.prisma.permission.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException('Permission code already exists');
    }

    return this.prisma.permission.create({ data: dto });
  }

  async update(id: string, dto: UpdatePermissionDto) {
    await this.findOne(id);
    return this.prisma.permission.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.rolePermission.deleteMany({
      where: { permissionId: id },
    });
    await this.prisma.permission.delete({ where: { id } });
    return { message: 'Permission deleted' };
  }
}
