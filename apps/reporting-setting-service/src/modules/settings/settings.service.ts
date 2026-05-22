import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SettingScope } from '.prisma/client/reporting';
import { ReportingPrismaService } from '../../prisma/reporting-prisma.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { QuerySettingsDto } from './dto/query-settings.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: ReportingPrismaService) {}

  async findAll(query: QuerySettingsDto) {
    const { page = 1, limit = 20, search, key, scope, branchId } = query;
    const where: Prisma.SettingWhereInput = {
      ...(search
        ? {
            OR: [
              { key: { contains: search, mode: 'insensitive' } },
              { branchId: { equals: search } },
            ],
          }
        : {}),
      ...(key ? { key } : {}),
      ...(scope ? { scope } : {}),
      ...(branchId ? { branchId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.setting.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.setting.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const setting = await this.prisma.setting.findUnique({ where: { id } });
    if (!setting) throw new NotFoundException('setting not found');
    return setting;
  }

  async findByKey(key: string, branchId?: string) {
    if (branchId) {
      const branchSetting = await this.prisma.setting.findUnique({
        where: { key_scope_branchId: { key, scope: SettingScope.BRANCH, branchId } },
      });
      if (branchSetting) return branchSetting;
    }

    const globalSetting = await this.prisma.setting.findFirst({
      where: { key, scope: SettingScope.SYSTEM, branchId: null },
      orderBy: { updatedAt: 'desc' },
    });
    if (!globalSetting) throw new NotFoundException('setting not found');
    return globalSetting;
  }

  async resolveEffective(key: string, branchId?: string) {
    return this.findByKey(key, branchId);
  }

  async create(dto: CreateSettingDto) {
    const scope = dto.scope ?? SettingScope.SYSTEM;
    const branchId = scope === SettingScope.SYSTEM ? null : (dto.branchId ?? null);
    this.validateScope(scope, branchId);

    try {
      return await this.prisma.setting.create({
        data: {
          key: dto.key,
          value: dto.value as Prisma.InputJsonValue,
          scope,
          branchId,
        },
      });
    } catch (error) {
      this.mapKnownPrismaError(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateSettingDto) {
    const existing = await this.findOne(id);
    const scope = dto.scope ?? existing.scope;
    const branchId =
      scope === SettingScope.SYSTEM
        ? null
        : dto.branchId !== undefined
          ? dto.branchId
          : existing.branchId;
    this.validateScope(scope, branchId);

    try {
      return await this.prisma.setting.update({
        where: { id },
        data: {
          ...(dto.value !== undefined ? { value: dto.value as Prisma.InputJsonValue } : {}),
          scope,
          branchId,
        },
      });
    } catch (error) {
      this.mapKnownPrismaError(error);
      throw error;
    }
  }

  async updateByKey(key: string, dto: UpdateSettingDto, branchId?: string) {
    const current = await this.findByKey(key, branchId);
    return this.update(current.id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.setting.delete({ where: { id } });
    return { deleted: true };
  }

  private validateScope(scope: SettingScope, branchId: string | null) {
    if (scope === SettingScope.SYSTEM && branchId) {
      throw new BadRequestException('branchId must be null for SYSTEM scope');
    }
    if (scope === SettingScope.BRANCH && !branchId) {
      throw new BadRequestException('branchId is required for BRANCH scope');
    }
  }

  private mapKnownPrismaError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('duplicate setting key/scope/branchId');
    }
  }
}
