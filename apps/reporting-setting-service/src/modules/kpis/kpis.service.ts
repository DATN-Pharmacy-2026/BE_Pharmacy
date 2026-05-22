import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '.prisma/client/reporting';
import { ReportingPrismaService } from '../../prisma/reporting-prisma.service';
import { CreateKpiSnapshotDto } from './dto/create-kpi-snapshot.dto';
import { QueryKpiSnapshotsDto } from './dto/query-kpi-snapshots.dto';

@Injectable()
export class KpisService {
  constructor(private readonly prisma: ReportingPrismaService) {}

  async findAll(query: QueryKpiSnapshotsDto) {
    const { page = 1, limit = 20, branchId, warehouseId, metricCode, snapshotDate, dateFrom, dateTo } = query;
    const where: Prisma.KPISnapshotWhereInput = {
      ...(branchId ? { branchId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(metricCode ? { metricCode } : {}),
      ...(snapshotDate
        ? {
            snapshotDate: {
              gte: this.toDayStart(new Date(snapshotDate)),
              lte: this.toDayEnd(new Date(snapshotDate)),
            },
          }
        : {}),
      ...((dateFrom || dateTo)
        ? {
            snapshotDate: {
              ...(dateFrom ? { gte: this.toDayStart(new Date(dateFrom)) } : {}),
              ...(dateTo ? { lte: this.toDayEnd(new Date(dateTo)) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.kPISnapshot.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.kPISnapshot.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const found = await this.prisma.kPISnapshot.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('KPI snapshot not found');
    return found;
  }

  async findByMetric(metricCode: string, query: QueryKpiSnapshotsDto) {
    return this.findAll({ ...query, metricCode });
  }

  async create(dto: CreateKpiSnapshotDto) {
    if (!dto.metricCode?.trim()) throw new BadRequestException('invalid metricCode');

    return this.prisma.kPISnapshot.create({
      data: {
        branchId: dto.branchId ?? null,
        warehouseId: dto.warehouseId ?? null,
        metricCode: dto.metricCode.trim(),
        metricValue: new Prisma.Decimal(dto.metricValue),
        snapshotDate: this.toDayStart(new Date(dto.snapshotDate)),
      },
    });
  }

  async bulkCreate(payload: { items: CreateKpiSnapshotDto[] }) {
    if (!payload.items || payload.items.length === 0) {
      throw new BadRequestException('bulk items empty');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let created = 0;
      for (const item of payload.items) {
        if (!item.metricCode?.trim()) {
          throw new BadRequestException('invalid metricCode');
        }
        const normalizedDate = this.toDayStart(new Date(item.snapshotDate));
        const existing = await tx.kPISnapshot.findFirst({
          where: {
            branchId: item.branchId ?? null,
            warehouseId: item.warehouseId ?? null,
            metricCode: item.metricCode.trim(),
            snapshotDate: { gte: normalizedDate, lte: this.toDayEnd(normalizedDate) },
          },
          select: { id: true },
        });

        if (existing) {
          await tx.kPISnapshot.update({
            where: { id: existing.id },
            data: { metricValue: new Prisma.Decimal(item.metricValue) },
          });
        } else {
          await tx.kPISnapshot.create({
            data: {
              branchId: item.branchId ?? null,
              warehouseId: item.warehouseId ?? null,
              metricCode: item.metricCode.trim(),
              metricValue: new Prisma.Decimal(item.metricValue),
              snapshotDate: normalizedDate,
            },
          });
          created += 1;
        }
      }
      return created;
    });

    return {
      created: result,
      updated: payload.items.length - result,
      total: payload.items.length,
    };
  }

  private toDayStart(d: Date): Date {
    const t = new Date(d);
    t.setHours(0, 0, 0, 0);
    return t;
  }

  private toDayEnd(d: Date): Date {
    const t = new Date(d);
    t.setHours(23, 59, 59, 999);
    return t;
  }
}
