import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AccessStatus, Prisma, UserStatus } from '.prisma/client/identity';
import { IdentityPrismaService } from '../../prisma/identity-prisma.service';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const ADMIN_ROLE_CODES = new Set(['ADMIN', 'SUPER_ADMIN']);
const EMPLOYEE_ROLE_CODES = new Set([
  'EMPLOYEE',
  'PHARMACIST',
  'BRANCH_MANAGER',
  'CASHIER',
  'INVENTORY_MANAGER',
  'CUSTOMER_SERVICE',
]);

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: IdentityPrismaService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(query: QueryUsersDto) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { username: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { fullName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data.map(this.toSafeUser),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toSafeUser(user);
  }

  async create(dto: CreateUserDto) {
    const username = dto.username?.trim() || dto.email;
    const passwordRaw = dto.passwordHash || dto.password;
    if (!passwordRaw) {
      throw new BadRequestException('passwordHash or password is required');
    }

    await this.ensureUnique(username, dto.email);
    const user = await this.prisma.user.create({
      data: {
        username,
        email: dto.email,
        phone: dto.phone ?? '',
        passwordHash: await this.normalizePasswordHash(passwordRaw),
        fullName: dto.fullName,
        avatarUrl: dto.avatarUrl,
        status:
          dto.status ??
          (dto.isActive === false ? UserStatus.INACTIVE : UserStatus.ACTIVE),
        isSystemAdmin: dto.isSystemAdmin ?? false,
      },
    });

    if (dto.roleCode || dto.roleIds?.length) {
      await this.assignRoles(user.id, {
        roleCode: dto.roleCode,
        roleIds: dto.roleIds,
      });
    }

    if (dto.branchId) {
      await this.prisma.userBranchAccess.upsert({
        where: { userId_branchId: { userId: user.id, branchId: dto.branchId } },
        create: {
          userId: user.id,
          branchId: dto.branchId,
          status: AccessStatus.ACTIVE,
          isDefaultBranch: true,
        },
        update: { status: AccessStatus.ACTIVE, isDefaultBranch: true },
      });
    }

    if (dto.warehouseId) {
      await this.prisma.userWarehouseAccess.upsert({
        where: {
          userId_warehouseId: { userId: user.id, warehouseId: dto.warehouseId },
        },
        create: {
          userId: user.id,
          warehouseId: dto.warehouseId,
          status: AccessStatus.ACTIVE,
        },
        update: { status: AccessStatus.ACTIVE },
      });
    }

    return this.toSafeUser(user);
  }

  private async normalizePasswordHash(input: string): Promise<string> {
    if (
      input.startsWith('$2a$') ||
      input.startsWith('$2b$') ||
      input.startsWith('$2y$')
    ) {
      return input;
    }

    const rounds = this.configService.get<number>('auth.bcryptSaltRounds', 10);
    return bcrypt.hash(input, rounds);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    if (dto.email) {
      await this.ensureUnique(undefined, dto.email, id);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        phone: dto.phone,
        fullName: dto.fullName,
        avatarUrl: dto.avatarUrl,
        status:
          dto.status ??
          (dto.isActive === undefined
            ? undefined
            : dto.isActive
              ? UserStatus.ACTIVE
              : UserStatus.INACTIVE),
        isSystemAdmin: dto.isSystemAdmin,
      },
    });

    let resolvedRoleId: string | undefined;
    let resolvedRoleCode: string | undefined;
    if (dto.roleCode || dto.roleIds?.length) {
      const assignedRoles = await this.assignRoles(id, {
        roleCode: dto.roleCode,
        roleIds: dto.roleIds,
      });
      resolvedRoleId = assignedRoles[0]?.roleId;
      resolvedRoleCode = assignedRoles[0]?.role?.code;
    }

    if (dto.branchId) {
      if (resolvedRoleId) {
        await this.prisma.userBranchAccess.updateMany({
          where: { userId: id, isDefaultBranch: true, branchId: { not: dto.branchId } },
          data: { isDefaultBranch: false },
        });
      }

      await this.prisma.userBranchAccess.upsert({
        where: { userId_branchId: { userId: id, branchId: dto.branchId } },
        create: {
          userId: id,
          branchId: dto.branchId,
          roleId: resolvedRoleId,
          canAccessPOS:
            (resolvedRoleCode
              ? ADMIN_ROLE_CODES.has(resolvedRoleCode) ||
                EMPLOYEE_ROLE_CODES.has(resolvedRoleCode)
              : false),
          isDefaultBranch: true,
          status: AccessStatus.ACTIVE,
        },
        update: {
          roleId: resolvedRoleId,
          canAccessPOS:
            (resolvedRoleCode
              ? ADMIN_ROLE_CODES.has(resolvedRoleCode) ||
                EMPLOYEE_ROLE_CODES.has(resolvedRoleCode)
              : false),
          isDefaultBranch: true,
          status: AccessStatus.ACTIVE,
        },
      });
    }

    if (dto.warehouseId) {
      await this.prisma.userWarehouseAccess.upsert({
        where: {
          userId_warehouseId: { userId: id, warehouseId: dto.warehouseId },
        },
        create: {
          userId: id,
          warehouseId: dto.warehouseId,
          roleId: resolvedRoleId,
          status: AccessStatus.ACTIVE,
        },
        update: {
          roleId: resolvedRoleId,
          status: AccessStatus.ACTIVE,
        },
      });
    }

    return this.toSafeUser(user);
  }

  async softDelete(id: string) {
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'User soft deleted' };
  }

  async resetPassword(id: string, dto: ResetPasswordDto) {
    await this.findOne(id);
    const rawPassword =
      dto.newPassword ||
      this.configService.get<string>('auth.defaultPassword', 'admin123');

    const passwordHash = await this.normalizePasswordHash(rawPassword);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return { message: 'Password reset successfully' };
  }

  async assignRoles(id: string, dto: AssignUserRolesDto) {
    await this.findOne(id);

    let roleIds = dto.roleIds ?? [];
    if (dto.roleCode) {
      const role = await this.prisma.role.findUnique({
        where: { code: dto.roleCode },
        select: { id: true },
      });
      if (!role) {
        throw new BadRequestException('Role code does not exist');
      }
      roleIds = [role.id];
    }

    if (!roleIds.length) {
      throw new BadRequestException('roleIds or roleCode is required');
    }

    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true },
    });
    if (roles.length !== roleIds.length) {
      throw new BadRequestException('One or more roleIds are invalid');
    }

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: id, roleId })),
        skipDuplicates: true,
      }),
    ]);

    return this.prisma.userRole.findMany({
      where: { userId: id },
      include: { role: true },
    });
  }

  private async ensureUnique(
    username?: string,
    email?: string,
    excludeUserId?: string,
  ) {
    if (username) {
      const user = await this.prisma.user.findFirst({
        where: {
          username,
          ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
        },
      });
      if (user) {
        throw new BadRequestException('Username already exists');
      }
    }

    if (email) {
      const user = await this.prisma.user.findFirst({
        where: {
          email,
          ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
        },
      });
      if (user) {
        throw new BadRequestException('Email already exists');
      }
    }
  }

  private toSafeUser(user: Prisma.UserGetPayload<Record<string, never>>) {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
