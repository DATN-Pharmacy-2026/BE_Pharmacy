import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationChannel,
  Prisma,
  ReportJobStatus,
} from '.prisma/client/reporting';
import { AuditLogWriterService } from '../audit-logs/audit-log-writer.service';
import { NotificationEventPublisherService } from '../notification-events/notification-event-publisher.service';
import { ReportingPrismaService } from '../../prisma/reporting-prisma.service';
import { CreateReportExportDto } from './dto/create-report-export.dto';
import { ExportReportDto } from './dto/export-report.dto';
import { QueryReportExportsDto } from './dto/query-report-exports.dto';
import { ExcelExportService } from './excel-export.service';
import { EXPORT_FILE_TYPES } from './export-file-types.constants';
import { ReportExportStorageService } from './report-export-storage.service';

@Injectable()
export class ReportExportsService {
  constructor(
    private readonly prisma: ReportingPrismaService,
    private readonly auditLogWriterService: AuditLogWriterService,
    private readonly excelExportService: ExcelExportService,
    private readonly reportExportStorageService: ReportExportStorageService,
    private readonly notificationEventPublisherService: NotificationEventPublisherService,
  ) {}

  async findAll(query: QueryReportExportsDto) {
    const {
      page = 1,
      limit = 20,
      reportJobId,
      fileType,
      reportType,
      dateFrom,
      dateTo,
      search,
    } = query;
    const where: Prisma.ReportExportWhereInput = {
      ...(reportJobId ? { reportJobId } : {}),
      ...(fileType ? { fileType } : {}),
      ...(reportType ? { reportJob: { reportType } } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { fileName: { contains: search, mode: 'insensitive' } },
              { fileUrl: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.reportExport.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reportExport.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const found = await this.prisma.reportExport.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('report export not found');
    return found;
  }

  async findByReportJobId(reportJobId: string, query: QueryReportExportsDto) {
    return this.findAll({ ...query, reportJobId });
  }

  async create(dto: CreateReportExportDto, actorUserId?: string) {
    const reportJob = await this.prisma.reportJob.findUnique({
      where: { id: dto.reportJobId },
    });
    if (!reportJob) throw new NotFoundException('report job not found');

    const created = await this.prisma.$transaction(async (tx) => {
      const exportItem = await tx.reportExport.create({
        data: {
          reportJobId: dto.reportJobId,
          fileName: dto.fileName,
          fileUrl: dto.fileUrl,
          fileType: dto.fileType,
        },
      });

      if (reportJob.status !== ReportJobStatus.COMPLETED) {
        await tx.reportJob.update({
          where: { id: dto.reportJobId },
          data: { status: ReportJobStatus.COMPLETED, completedAt: new Date() },
        });
      }

      return exportItem;
    });

    void this.auditLogWriterService.write({
      actorUserId,
      branchId: reportJob.branchId ?? undefined,
      warehouseId: reportJob.warehouseId ?? undefined,
      serviceName: 'reporting-setting-service',
      module: 'report-exports',
      action: 'create_export',
      entityType: 'ReportExport',
      entityId: created.id,
      afterData: created,
    });

    return created;
  }

  async generateForReportJob(
    reportJobId: string,
    payload: ExportReportDto = {},
    actorUserId?: string,
  ) {
    const reportJob = await this.prisma.reportJob.findUnique({
      where: { id: reportJobId },
      include: { exports: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!reportJob) throw new NotFoundException('report job not found');
    if (reportJob.status === ReportJobStatus.PROCESSING) {
      throw new ConflictException('report job is already processing');
    }
    if (
      !payload.force &&
      reportJob.status === ReportJobStatus.COMPLETED &&
      reportJob.exports[0]
    ) {
      const latest = reportJob.exports[0];
      return {
        reportJob,
        reportExport: latest,
        downloadUrl: `/api/report-exports/${latest.id}/download`,
      };
    }

    const fileType = (payload.fileType ?? 'XLSX').toUpperCase();
    if (!EXPORT_FILE_TYPES.includes(fileType as 'XLSX')) {
      throw new BadRequestException('unsupported file type');
    }

    await this.prisma.reportJob.update({
      where: { id: reportJobId },
      data: { status: ReportJobStatus.PROCESSING },
    });

    try {
      const buffer =
        fileType === 'CSV'
          ? await this.excelExportService.generateCsvBuffer(reportJob)
          : await this.excelExportService.generateWorkbookBuffer(reportJob);
      const fileName = this.resolveFileName(
        reportJob.reportType,
        payload.fileName,
        fileType,
      );
      await this.reportExportStorageService.writeFile(
        reportJob.id,
        fileName,
        buffer,
      );

      const result = await this.prisma.$transaction(async (tx) => {
        const createdExport = await tx.reportExport.create({
          data: {
            reportJobId,
            fileName,
            fileUrl: '/api/report-exports/pending/download',
            fileType,
          },
        });
        const fileUrl = `/api/report-exports/${createdExport.id}/download`;
        const updatedExport = await tx.reportExport.update({
          where: { id: createdExport.id },
          data: { fileUrl },
        });

        const updatedJob = await tx.reportJob.update({
          where: { id: reportJobId },
          data: {
            status: ReportJobStatus.COMPLETED,
            completedAt: new Date(),
          },
        });

        return { createdExport: updatedExport, updatedJob };
      });

      void this.auditLogWriterService.write({
        actorUserId,
        branchId: reportJob.branchId ?? undefined,
        warehouseId: reportJob.warehouseId ?? undefined,
        serviceName: 'reporting-setting-service',
        module: 'report-exports',
        action: 'generate',
        entityType: 'ReportExport',
        entityId: result.createdExport.id,
        afterData: result.createdExport,
      });

      if (payload.deliverNotification ?? true) {
        void this.notificationEventPublisherService
          .publishReportExportCompleted(
            {
              reportJobId: result.updatedJob.id,
              reportExportId: result.createdExport.id,
              downloadUrl: `/api/report-exports/${result.createdExport.id}/download`,
              reportType: result.updatedJob.reportType,
              recipientUserId: result.updatedJob.requestedByUserId,
              branchId: result.updatedJob.branchId,
              warehouseId: result.updatedJob.warehouseId,
            },
            {
              deliverImmediately: true,
              channels: payload.channels ?? [NotificationChannel.IN_APP],
              recipientEmail: payload.recipientEmail,
              dryRun: payload.dryRunNotification,
            },
          )
          .catch(() => undefined);
      }

      return {
        reportJob: result.updatedJob,
        reportExport: result.createdExport,
        downloadUrl: `/api/report-exports/${result.createdExport.id}/download`,
      };
    } catch (error) {
      await this.prisma.reportJob.update({
        where: { id: reportJobId },
        data: { status: ReportJobStatus.FAILED },
      });
      if (payload.deliverNotification ?? true) {
        void this.notificationEventPublisherService
          .publishReportExportFailed(
            {
              reportJobId: reportJob.id,
              reportType: reportJob.reportType,
              recipientUserId: reportJob.requestedByUserId,
              branchId: reportJob.branchId,
              warehouseId: reportJob.warehouseId,
              errorMessage: 'Report export generation failed.',
            },
            {
              deliverImmediately: true,
              channels: payload.channels ?? [NotificationChannel.IN_APP],
              recipientEmail: payload.recipientEmail,
              dryRun: payload.dryRunNotification,
            },
          )
          .catch(() => undefined);
      }
      throw new InternalServerErrorException('export generation failed');
    }
  }

  async resolveDownloadByExportId(id: string) {
    const exportItem = await this.findOne(id);
    const filePath = this.reportExportStorageService.resolveExportPath(
      exportItem.reportJobId,
      exportItem.fileName,
    );
    const exists = await this.reportExportStorageService.fileExists(filePath);
    if (!exists) throw new NotFoundException('export file not found');
    return { exportItem, filePath };
  }

  recordDownloadAudit(exportId: string, actorUserId?: string) {
    void this.auditLogWriterService.write({
      actorUserId,
      serviceName: 'reporting-setting-service',
      module: 'report-exports',
      action: 'download',
      entityType: 'ReportExport',
      entityId: exportId,
    });
  }

  private resolveFileName(
    reportType: string,
    inputFileName?: string,
    fileType: string = 'XLSX',
  ): string {
    const extension = fileType === 'CSV' ? 'csv' : 'xlsx';
    if (inputFileName) {
      const named = /\.[a-z0-9]+$/i.test(inputFileName)
        ? inputFileName
        : `${inputFileName}.${extension}`;
      return this.reportExportStorageService.sanitizeFileName(named);
    }
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '_')
      .slice(0, 15);
    return this.reportExportStorageService.sanitizeFileName(
      `${reportType}_${timestamp}.${extension}`,
    );
  }
}
