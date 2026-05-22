import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IdentityPrismaService } from '../../prisma/identity-prisma.service';
import { AssignUserBranchAccessDto } from './dto/assign-user-branch-access.dto';
import { AssignUserWarehouseAccessDto } from './dto/assign-user-warehouse-access.dto';
import { UpdateUserBranchAccessDto } from './dto/update-user-branch-access.dto';
import { UpdateUserWarehouseAccessDto } from './dto/update-user-warehouse-access.dto';

@Injectable()
export class AccessService {
  constructor(private readonly prisma: IdentityPrismaService) {}

  async upsertUserBranchAccess(userId: string, dto: AssignUserBranchAccessDto) {
    await this.ensureUserExists(userId);
    await this.ensureRoleIfProvided(dto.roleId);

    if (dto.isDefaultBranch) {
      await this.prisma.userBranchAccess.updateMany({
        where: {
          userId,
          isDefaultBranch: true,
          branchId: { not: dto.branchId },
        },
        data: { isDefaultBranch: false },
      });
    }

    return this.prisma.userBranchAccess.upsert({
      where: {
        userId_branchId: {
          userId,
          branchId: dto.branchId,
        },
      },
      update: {
        roleId: dto.roleId,
        canAccessPOS: dto.canAccessPOS,
        canManageInventory: dto.canManageInventory,
        canApproveTransfer: dto.canApproveTransfer,
        isDefaultBranch: dto.isDefaultBranch,
        status: dto.status,
      },
      create: {
        userId,
        branchId: dto.branchId,
        roleId: dto.roleId,
        canAccessPOS: dto.canAccessPOS,
        canManageInventory: dto.canManageInventory,
        canApproveTransfer: dto.canApproveTransfer,
        isDefaultBranch: dto.isDefaultBranch,
        status: dto.status,
      },
    });
  }

  async listUserBranchAccess(userId: string) {
    await this.ensureUserExists(userId);
    return this.prisma.userBranchAccess.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUserBranchAccess(
    userId: string,
    branchId: string,
    dto: UpdateUserBranchAccessDto,
  ) {
    await this.ensureUserExists(userId);
    if (dto.roleId) {
      await this.ensureRoleIfProvided(dto.roleId);
    }

    const existing = await this.prisma.userBranchAccess.findUnique({
      where: { userId_branchId: { userId, branchId } },
    });

    if (!existing) {
      throw new NotFoundException('User branch access not found');
    }

    if (dto.isDefaultBranch) {
      await this.prisma.userBranchAccess.updateMany({
        where: { userId, isDefaultBranch: true, branchId: { not: branchId } },
        data: { isDefaultBranch: false },
      });
    }

    return this.prisma.userBranchAccess.update({
      where: { userId_branchId: { userId, branchId } },
      data: dto,
    });
  }

  async deleteUserBranchAccess(userId: string, branchId: string) {
    await this.ensureUserExists(userId);
    await this.prisma.userBranchAccess.delete({
      where: { userId_branchId: { userId, branchId } },
    });
    return { message: 'User branch access removed' };
  }

  async upsertUserWarehouseAccess(
    userId: string,
    dto: AssignUserWarehouseAccessDto,
  ) {
    await this.ensureUserExists(userId);
    await this.ensureRoleIfProvided(dto.roleId);

    return this.prisma.userWarehouseAccess.upsert({
      where: { userId_warehouseId: { userId, warehouseId: dto.warehouseId } },
      update: {
        roleId: dto.roleId,
        canReceiveStock: dto.canReceiveStock,
        canTransferStock: dto.canTransferStock,
        canAdjustStock: dto.canAdjustStock,
        status: dto.status,
      },
      create: {
        userId,
        warehouseId: dto.warehouseId,
        roleId: dto.roleId,
        canReceiveStock: dto.canReceiveStock,
        canTransferStock: dto.canTransferStock,
        canAdjustStock: dto.canAdjustStock,
        status: dto.status,
      },
    });
  }

  async listUserWarehouseAccess(userId: string) {
    await this.ensureUserExists(userId);
    return this.prisma.userWarehouseAccess.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUserWarehouseAccess(
    userId: string,
    warehouseId: string,
    dto: UpdateUserWarehouseAccessDto,
  ) {
    await this.ensureUserExists(userId);
    if (dto.roleId) {
      await this.ensureRoleIfProvided(dto.roleId);
    }

    const existing = await this.prisma.userWarehouseAccess.findUnique({
      where: { userId_warehouseId: { userId, warehouseId } },
    });

    if (!existing) {
      throw new NotFoundException('User warehouse access not found');
    }

    return this.prisma.userWarehouseAccess.update({
      where: { userId_warehouseId: { userId, warehouseId } },
      data: dto,
    });
  }

  async deleteUserWarehouseAccess(userId: string, warehouseId: string) {
    await this.ensureUserExists(userId);
    await this.prisma.userWarehouseAccess.delete({
      where: { userId_warehouseId: { userId, warehouseId } },
    });
    return { message: 'User warehouse access removed' };
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  private async ensureRoleIfProvided(roleId?: string): Promise<void> {
    if (!roleId) {
      return;
    }

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true },
    });
    if (!role) {
      throw new BadRequestException('Role not found');
    }
  }
}
