import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IdentityPrismaService } from '../../prisma/identity-prisma.service';
import { AssignRolePermissionsDto } from './dto/assign-role-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: IdentityPrismaService) {}

  private normalizeRoleCode(value: string): string {
    return value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');
  }

  private async ensureUniqueRoleCode(baseCode: string): Promise<string> {
    let candidate = baseCode;
    let index = 1;
    while (true) {
      const existing = await this.prisma.role.findUnique({
        where: { code: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
      candidate = `${baseCode}_${index}`;
      index += 1;
    }
  }

  findAll() {
    return this.prisma.role.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: {
                id: true,
                code: true,
                name: true,
                module: true,
                action: true,
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: {
                id: true,
                code: true,
                name: true,
                module: true,
                action: true,
              },
            },
          },
        },
      },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async create(dto: CreateRoleDto) {
    const normalizedFromInput = dto.code
      ? this.normalizeRoleCode(dto.code)
      : '';
    const normalizedFromName = this.normalizeRoleCode(dto.name || '');
    const baseCode = normalizedFromInput || normalizedFromName || 'ROLE';
    const finalCode = await this.ensureUniqueRoleCode(baseCode);

    return this.prisma.role.create({
      data: {
        ...dto,
        code: finalCode,
      },
    });
  }

  async update(id: string, dto: UpdateRoleDto) {
    await this.findOne(id);
    return this.prisma.role.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const role = await this.findOne(id);
    if (role.isSystemRole) {
      throw new BadRequestException('System role cannot be deleted');
    }

    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await this.prisma.userRole.deleteMany({ where: { roleId: id } });
    await this.prisma.role.delete({ where: { id } });

    return { message: 'Role deleted' };
  }

  async assignPermissions(roleId: string, dto: AssignRolePermissionsDto) {
    await this.findOne(roleId);

    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: dto.permissionIds } },
      select: { id: true },
    });

    if (permissions.length !== dto.permissionIds.length) {
      throw new BadRequestException('One or more permissions are invalid');
    }

    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    await this.prisma.rolePermission.createMany({
      data: dto.permissionIds.map((permissionId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    });

    return this.prisma.rolePermission.findMany({ where: { roleId } });
  }
}
