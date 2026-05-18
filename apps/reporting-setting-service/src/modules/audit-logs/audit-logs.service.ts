import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '.prisma/client/reporting';
import { ReportingPrismaService } from '../../prisma/reporting-prisma.service';
import { AuditLogWriterService } from './audit-log-writer.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

@Injectable()
export class AuditLogsService {
  constructor(
    private readonly prisma: ReportingPrismaService,
    private readonly auditLogWriterService: AuditLogWriterService,
  ) {}

  async create(dto: CreateAuditLogDto) {
    const created = await this.auditLogWriterService.write(dto);
    if (!created) throw new NotFoundException('failed to create audit log');
    return this.maskAuditLog(created);
  }

  async findAll(query: QueryAuditLogsDto) {
    const {
      page = 1,
      limit = 20,
      actorUserId,
      branchId,
      warehouseId,
      serviceName,
      module,
      action,
      entityType,
      entityId,
      dateFrom,
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const allowedSortFields = ['createdAt', 'serviceName', 'module', 'action'];
    if (!allowedSortFields.includes(sortBy)) {
      throw new BadRequestException('Invalid sort field');
    }
    const normalizedSearch = search?.trim();

    const where: Prisma.AuditLogWhereInput = {
      ...(actorUserId ? { actorUserId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(serviceName ? { serviceName: { contains: serviceName, mode: 'insensitive' } } : {}),
      ...(module ? { module: { contains: module, mode: 'insensitive' } } : {}),
      ...(action ? { action: { contains: action, mode: 'insensitive' } } : {}),
      ...(entityType ? { entityType: { contains: entityType, mode: 'insensitive' } } : {}),
      ...(entityId ? { entityId } : {}),
      ...((dateFrom || dateTo)
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
      ...(normalizedSearch
        ? {
            OR: [
              { serviceName: { contains: normalizedSearch, mode: 'insensitive' } },
              { module: { contains: normalizedSearch, mode: 'insensitive' } },
              { action: { contains: normalizedSearch, mode: 'insensitive' } },
              { entityType: { contains: normalizedSearch, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          actorUserId: true,
          branchId: true,
          warehouseId: true,
          serviceName: true,
          module: true,
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('audit log not found');
    return this.maskAuditLog(log);
  }

  async findByEntity(entityType: string, entityId: string, query: QueryAuditLogsDto) {
    return this.findAll({ ...query, entityType, entityId });
  }

  async findByUser(actorUserId: string, query: QueryAuditLogsDto) {
    return this.findAll({ ...query, actorUserId });
  }

  private maskAuditLog<T extends { beforeData: unknown; afterData: unknown }>(log: T): T {
    return {
      ...log,
      beforeData: this.auditLogWriterService.maskSensitiveData(log.beforeData),
      afterData: this.auditLogWriterService.maskSensitiveData(log.afterData),
    };
  }
}
