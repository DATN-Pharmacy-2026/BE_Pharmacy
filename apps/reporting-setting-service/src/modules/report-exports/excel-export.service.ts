import { Injectable } from '@nestjs/common';
import { ReportJob } from '.prisma/client/reporting';
import { ReportingPrismaService } from '../../prisma/reporting-prisma.service';

const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Injectable()
export class ExcelExportService {
  constructor(private readonly prisma: ReportingPrismaService) {}

  get contentType() {
    return XLSX_CONTENT_TYPE;
  }

  async generateWorkbookBuffer(reportJob: ReportJob): Promise<Buffer> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const filters = (reportJob.filters ?? {}) as Record<string, unknown>;

    this.addMetadataSheet(workbook, reportJob, filters);
    await this.addDataSheet(workbook, reportJob, filters);

    const data = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(data) ? data : Buffer.from(data);
  }

  private addMetadataSheet(
    workbook: import('exceljs').Workbook,
    reportJob: ReportJob,
    filters: Record<string, unknown>,
  ) {
    const sheet = workbook.addWorksheet('Metadata');
    sheet.columns = [
      { header: 'Field', key: 'field', width: 28 },
      { header: 'Value', key: 'value', width: 60 },
    ];

    const rows = [
      ['Report Job ID', reportJob.id],
      ['Report Type', reportJob.reportType],
      ['Branch ID', reportJob.branchId ?? ''],
      ['Warehouse ID', reportJob.warehouseId ?? ''],
      ['Requested By User ID', reportJob.requestedByUserId],
      ['Status', reportJob.status],
      ['Created At', reportJob.createdAt.toISOString()],
      ['Completed At', reportJob.completedAt?.toISOString() ?? ''],
      ['Filters JSON', JSON.stringify(filters)],
    ];

    rows.forEach((r) => sheet.addRow(r));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  private async addDataSheet(
    workbook: import('exceljs').Workbook,
    reportJob: ReportJob,
    filters: Record<string, unknown>,
  ) {
    switch (reportJob.reportType) {
      case 'SALES_SUMMARY':
      case 'DASHBOARD_KPI':
      case 'INVENTORY_SUMMARY':
      case 'LOW_STOCK':
      case 'EXPIRING_BATCHES':
        await this.addKpiSnapshotSheet(workbook, reportJob, filters);
        return;
      case 'AUDIT_LOG':
        await this.addAuditLogSheet(workbook, reportJob, filters);
        return;
      case 'SETTINGS':
        await this.addSettingsSheet(workbook);
        return;
      default:
        this.addLimitationSheet(workbook, reportJob.reportType);
    }
  }

  private async addKpiSnapshotSheet(
    workbook: import('exceljs').Workbook,
    reportJob: ReportJob,
    filters: Record<string, unknown>,
  ) {
    const where: Record<string, unknown> = {};
    if (reportJob.branchId) where.branchId = reportJob.branchId;
    if (reportJob.warehouseId) where.warehouseId = reportJob.warehouseId;
    if (typeof filters.metricCode === 'string') where.metricCode = filters.metricCode;

    const dateFrom = this.parseDate(filters.dateFrom);
    const dateTo = this.parseDate(filters.dateTo);
    if (dateFrom || dateTo) {
      where.snapshotDate = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }

    const rows = await this.prisma.kPISnapshot.findMany({
      where,
      orderBy: [{ snapshotDate: 'asc' }, { metricCode: 'asc' }],
      take: 5000,
    });

    const sheet = workbook.addWorksheet('Data');
    sheet.columns = [
      { header: 'Snapshot Date', key: 'snapshotDate', width: 18 },
      { header: 'Metric Code', key: 'metricCode', width: 28 },
      { header: 'Metric Value', key: 'metricValue', width: 18 },
      { header: 'Branch ID', key: 'branchId', width: 40 },
      { header: 'Warehouse ID', key: 'warehouseId', width: 40 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    if (rows.length === 0) {
      sheet.addRow({
        snapshotDate: '',
        metricCode: 'NO_DATA',
        metricValue: 0,
        branchId: '',
        warehouseId: '',
      });
      return;
    }

    rows.forEach((row) => {
      sheet.addRow({
        snapshotDate: row.snapshotDate.toISOString().slice(0, 10),
        metricCode: row.metricCode,
        metricValue: Number(row.metricValue),
        branchId: row.branchId ?? '',
        warehouseId: row.warehouseId ?? '',
      });
    });
  }

  private async addAuditLogSheet(
    workbook: import('exceljs').Workbook,
    reportJob: ReportJob,
    filters: Record<string, unknown>,
  ) {
    const where: Record<string, unknown> = {};
    if (reportJob.branchId) where.branchId = reportJob.branchId;
    if (reportJob.warehouseId) where.warehouseId = reportJob.warehouseId;
    if (typeof filters.serviceName === 'string') where.serviceName = filters.serviceName;
    if (typeof filters.module === 'string') where.module = filters.module;
    if (typeof filters.action === 'string') where.action = filters.action;
    if (typeof filters.entityType === 'string') where.entityType = filters.entityType;
    if (typeof filters.entityId === 'string') where.entityId = filters.entityId;
    if (typeof filters.actorUserId === 'string') where.actorUserId = filters.actorUserId;
    const dateFrom = this.parseDate(filters.dateFrom);
    const dateTo = this.parseDate(filters.dateTo);
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }

    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const sheet = workbook.addWorksheet('Data');
    sheet.columns = [
      { header: 'Created At', key: 'createdAt', width: 24 },
      { header: 'Service', key: 'serviceName', width: 24 },
      { header: 'Module', key: 'module', width: 24 },
      { header: 'Action', key: 'action', width: 22 },
      { header: 'Entity Type', key: 'entityType', width: 22 },
      { header: 'Entity ID', key: 'entityId', width: 40 },
      { header: 'Actor User ID', key: 'actorUserId', width: 40 },
      { header: 'Branch ID', key: 'branchId', width: 40 },
      { header: 'Warehouse ID', key: 'warehouseId', width: 40 },
      { header: 'Before Data', key: 'beforeData', width: 50 },
      { header: 'After Data', key: 'afterData', width: 50 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    if (rows.length === 0) {
      sheet.addRow({
        createdAt: '',
        serviceName: 'NO_DATA',
      });
      return;
    }

    rows.forEach((row) => {
      sheet.addRow({
        createdAt: row.createdAt.toISOString(),
        serviceName: row.serviceName,
        module: row.module,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId ?? '',
        actorUserId: row.actorUserId ?? '',
        branchId: row.branchId ?? '',
        warehouseId: row.warehouseId ?? '',
        beforeData: row.beforeData ? JSON.stringify(row.beforeData) : '',
        afterData: row.afterData ? JSON.stringify(row.afterData) : '',
      });
    });
  }

  private async addSettingsSheet(workbook: import('exceljs').Workbook) {
    const settings = await this.prisma.setting.findMany({
      orderBy: [{ scope: 'asc' }, { key: 'asc' }],
      take: 5000,
    });
    const sheet = workbook.addWorksheet('Data');
    sheet.columns = [
      { header: 'Key', key: 'key', width: 40 },
      { header: 'Scope', key: 'scope', width: 16 },
      { header: 'Branch ID', key: 'branchId', width: 40 },
      { header: 'Value', key: 'value', width: 60 },
      { header: 'Updated At', key: 'updatedAt', width: 24 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    settings.forEach((s) =>
      sheet.addRow({
        key: s.key,
        scope: s.scope,
        branchId: s.branchId ?? '',
        value: JSON.stringify(s.value),
        updatedAt: s.updatedAt.toISOString(),
      }),
    );
  }

  private addLimitationSheet(
    workbook: import('exceljs').Workbook,
    reportType: string,
  ) {
    const sheet = workbook.addWorksheet('Data');
    sheet.columns = [
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Message', key: 'message', width: 100 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.addRow({
      status: 'NOT_IMPLEMENTED',
      message: `Report type ${reportType} is not fully implemented for export in foundation phase. No cross-service query is performed.`,
    });
  }

  private parseDate(input: unknown): Date | undefined {
    if (typeof input !== 'string') return undefined;
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
}
