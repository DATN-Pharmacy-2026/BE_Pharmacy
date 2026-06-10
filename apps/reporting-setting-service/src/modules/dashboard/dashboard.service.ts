import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '.prisma/client/reporting';
import { ReportingPrismaService } from '../../prisma/reporting-prisma.service';
import {
  DASHBOARD_METRIC_CODES,
  DEFAULT_DASHBOARD_METRICS,
} from './dashboard-metrics.constants';
import { CreateDashboardSnapshotDto } from './dto/create-dashboard-snapshot.dto';
import { DashboardOverviewQueryDto } from './dto/dashboard-overview-query.dto';
import { QueryDashboardSnapshotsDto } from './dto/query-dashboard-snapshots.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: ReportingPrismaService) {}

  async getOverview(query: DashboardOverviewQueryDto) {
    const targetDate = query.date ? new Date(query.date) : new Date();
    const dateStart = this.toDayStart(targetDate);
    const dateEnd = this.toDayEnd(targetDate);

    const whereScope = {
      ...(query.branchId ? { branchId: query.branchId } : { branchId: null }),
      ...(query.warehouseId
        ? { warehouseId: query.warehouseId }
        : { warehouseId: null }),
    };

    const [kpis, snapshot] = await this.prisma.$transaction([
      this.prisma.kPISnapshot.findMany({
        where: {
          ...whereScope,
          snapshotDate: { gte: dateStart, lte: dateEnd },
        },
      }),
      this.prisma.dashboardSnapshot.findFirst({
        where: {
          ...whereScope,
          snapshotDate: { gte: dateStart, lte: dateEnd },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const metrics = { ...DEFAULT_DASHBOARD_METRICS };
    for (const item of kpis) {
      if (DASHBOARD_METRIC_CODES.includes(item.metricCode as never)) {
        metrics[item.metricCode as keyof typeof metrics] = Number(
          item.metricValue,
        );
      }
    }
    const kpiList = Object.entries(metrics).map(([key, value]) => ({
      key,
      label: key,
      value,
    }));

    return {
      scope: {
        branchId: query.branchId ?? null,
        warehouseId: query.warehouseId ?? null,
      },
      date: this.formatLocalDate(dateStart),
      metrics,
      kpis: kpiList,
      items: kpiList,
      snapshot: snapshot?.data ?? {},
      generatedAt: new Date().toISOString(),
    };
  }

  async findSnapshots(query: QueryDashboardSnapshotsDto) {
    const {
      page = 1,
      limit = 20,
      branchId,
      warehouseId,
      snapshotDate,
      dateFrom,
      dateTo,
    } = query;

    const where: Prisma.DashboardSnapshotWhereInput = {
      ...(branchId ? { branchId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(snapshotDate
        ? {
            snapshotDate: {
              gte: this.toDayStart(new Date(snapshotDate)),
              lte: this.toDayEnd(new Date(snapshotDate)),
            },
          }
        : {}),
      ...(dateFrom || dateTo
        ? {
            snapshotDate: {
              ...(dateFrom ? { gte: this.toDayStart(new Date(dateFrom)) } : {}),
              ...(dateTo ? { lte: this.toDayEnd(new Date(dateTo)) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.dashboardSnapshot.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.dashboardSnapshot.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findSnapshotById(id: string) {
    const found = await this.prisma.dashboardSnapshot.findUnique({
      where: { id },
    });
    if (!found) throw new NotFoundException('dashboard snapshot not found');
    return found;
  }

  async createSnapshot(dto: CreateDashboardSnapshotDto) {
    return this.prisma.dashboardSnapshot.create({
      data: {
        branchId: dto.branchId ?? null,
        warehouseId: dto.warehouseId ?? null,
        snapshotDate: this.toDayStart(new Date(dto.snapshotDate)),
        data: dto.data as Prisma.InputJsonValue,
      },
    });
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

  private formatLocalDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
