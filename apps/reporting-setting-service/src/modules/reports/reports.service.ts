import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReportJobStatus } from '.prisma/client/reporting';
import { AuditLogWriterService } from '../audit-logs/audit-log-writer.service';
import { ReportExportsService } from '../report-exports/report-exports.service';
import { ReportingPrismaService } from '../../prisma/reporting-prisma.service';
import { CreateReportJobDto } from './dto/create-report-job.dto';
import { QueryReportJobsDto } from './dto/query-report-jobs.dto';
import { ReportSummaryQueryDto } from './dto/report-summary-query.dto';
import { UpdateReportJobStatusDto } from './dto/update-report-job-status.dto';
import { REPORT_TYPE_DESCRIPTIONS, REPORT_TYPES } from './report-types.constants';

const DEV_USER_ID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: ReportingPrismaService,
    private readonly auditLogWriterService: AuditLogWriterService,
    private readonly reportExportsService: ReportExportsService,
  ) {}

  async findAll(query: QueryReportJobsDto) {
    const { page = 1, limit = 20, reportType, requestedByUserId, branchId, warehouseId, status, dateFrom, dateTo } = query;
    const where: Prisma.ReportJobWhereInput = {
      ...(reportType ? { reportType } : {}),
      ...(requestedByUserId ? { requestedByUserId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(status ? { status } : {}),
      ...((dateFrom || dateTo)
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.reportJob.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          reportType: true,
          requestedByUserId: true,
          branchId: true,
          warehouseId: true,
          status: true,
          createdAt: true,
          completedAt: true,
          exports: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              fileName: true,
              fileUrl: true,
              fileType: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reportJob.count({ where }),
    ]);

    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const found = await this.prisma.reportJob.findUnique({
      where: { id },
      include: { exports: { orderBy: { createdAt: 'desc' } } },
    });
    if (!found) throw new NotFoundException('report job not found');
    return found;
  }

  async create(dto: CreateReportJobDto, userId?: string) {
    const reportType = dto.reportType?.trim();
    if (!reportType || !REPORT_TYPES.includes(reportType as never)) {
      throw new BadRequestException('invalid reportType');
    }

    const created = await this.prisma.reportJob.create({
      data: {
        reportType,
        requestedByUserId: dto.requestedByUserId ?? userId ?? DEV_USER_ID,
        branchId: dto.branchId ?? null,
        warehouseId: dto.warehouseId ?? null,
        status: ReportJobStatus.QUEUED,
        filters:
          dto.filters === undefined
            ? undefined
            : (dto.filters as Prisma.InputJsonValue),
      },
    });

    void this.auditLogWriterService.write({
      actorUserId: userId ?? dto.requestedByUserId,
      branchId: created.branchId ?? undefined,
      warehouseId: created.warehouseId ?? undefined,
      serviceName: 'reporting-setting-service',
      module: 'reports',
      action: 'create',
      entityType: 'ReportJob',
      entityId: created.id,
      afterData: created,
    });

    return created;
  }

  async updateStatus(id: string, dto: UpdateReportJobStatusDto, userId?: string) {
    const existing = await this.findOne(id);
    const completedAt =
      dto.status === ReportJobStatus.COMPLETED
        ? (dto.completedAt ? new Date(dto.completedAt) : new Date())
        : dto.status === ReportJobStatus.FAILED
          ? existing.completedAt
          : null;

    const updated = await this.prisma.reportJob.update({
      where: { id },
      data: {
        status: dto.status,
        completedAt,
      },
    });

    void this.auditLogWriterService.write({
      actorUserId: userId,
      branchId: updated.branchId ?? undefined,
      warehouseId: updated.warehouseId ?? undefined,
      serviceName: 'reporting-setting-service',
      module: 'reports',
      action: 'update_status',
      entityType: 'ReportJob',
      entityId: updated.id,
      beforeData: { status: existing.status, completedAt: existing.completedAt },
      afterData: { status: updated.status, completedAt: updated.completedAt },
    });

    return updated;
  }

  async process(
    id: string,
    options: { fileType?: string; fileName?: string; includeMetadata?: boolean } = {},
    userId?: string,
  ) {
    await this.findOne(id);
    return this.reportExportsService.generateForReportJob(
      id,
      {
        fileType: options.fileType,
        fileName: options.fileName,
        includeMetadata: options.includeMetadata,
      },
      userId,
    );
  }

  getTypes() {
    return {
      items: REPORT_TYPES.map((code) => ({
        code,
        description: REPORT_TYPE_DESCRIPTIONS[code],
      })),
    };
  }

  async summary(query: ReportSummaryQueryDto) {
    const where: Prisma.ReportJobWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...((query.dateFrom || query.dateTo)
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [totalJobs, queuedJobs, processingJobs, completedJobs, failedJobs, totalExports, latest] =
      await this.prisma.$transaction([
        this.prisma.reportJob.count({ where }),
        this.prisma.reportJob.count({ where: { ...where, status: ReportJobStatus.QUEUED } }),
        this.prisma.reportJob.count({ where: { ...where, status: ReportJobStatus.PROCESSING } }),
        this.prisma.reportJob.count({ where: { ...where, status: ReportJobStatus.COMPLETED } }),
        this.prisma.reportJob.count({ where: { ...where, status: ReportJobStatus.FAILED } }),
        this.prisma.reportExport.count({
          where: {
            reportJob: where,
          },
        }),
        this.prisma.reportJob.findFirst({ where, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      ]);

    return {
      totalJobs,
      pendingJobs: queuedJobs,
      processingJobs,
      completedJobs,
      failedJobs,
      totalExports,
      latestJobCreatedAt: latest?.createdAt ?? null,
    };
  }
}
