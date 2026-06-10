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

  get csvContentType() {
    return 'text/csv; charset=utf-8';
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

  async generateCsvBuffer(reportJob: ReportJob): Promise<Buffer> {
    const filters = (reportJob.filters ?? {}) as Record<string, unknown>;
    const { columns, rows } = await this.getTabularData(reportJob, filters);
    const header = columns.join(',');
    const lines = rows.map((row) =>
      columns.map((key) => this.escapeCsvCell(row[key])).join(','),
    );
    return Buffer.from([header, ...lines].join('\n'), 'utf-8');
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
    const { columns, rows } = await this.getTabularData(reportJob, filters);
    const sheet = workbook.addWorksheet('Data');
    sheet.columns = columns.map((key) => ({
      header: this.humanizeKey(key),
      key,
      width: Math.max(16, Math.min(60, key.length + 10)),
    }));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    if (rows.length === 0) {
      const fallback: Record<string, string> = {};
      fallback[columns[0] ?? 'status'] = 'NO_DATA';
      sheet.addRow(fallback);
      return;
    }

    rows.forEach((row) => sheet.addRow(row));
  }

  private async getKpiRows(
    reportJob: ReportJob,
    filters: Record<string, unknown>,
  ): Promise<Array<Record<string, string | number>>> {
    const where: Record<string, unknown> = {};
    if (reportJob.branchId) where.branchId = reportJob.branchId;
    if (reportJob.warehouseId) where.warehouseId = reportJob.warehouseId;
    if (typeof filters.metricCode === 'string')
      where.metricCode = filters.metricCode;

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

    return rows.map((row) => ({
      snapshotDate: row.snapshotDate.toISOString().slice(0, 10),
      metricCode: row.metricCode,
      metricValue: Number(row.metricValue),
      branchId: row.branchId ?? '',
      warehouseId: row.warehouseId ?? '',
    }));
  }

  private async getAuditRows(
    reportJob: ReportJob,
    filters: Record<string, unknown>,
  ): Promise<Array<Record<string, string>>> {
    const where: Record<string, unknown> = {};
    if (reportJob.branchId) where.branchId = reportJob.branchId;
    if (reportJob.warehouseId) where.warehouseId = reportJob.warehouseId;
    if (typeof filters.serviceName === 'string')
      where.serviceName = filters.serviceName;
    if (typeof filters.module === 'string') where.module = filters.module;
    if (typeof filters.action === 'string') where.action = filters.action;
    if (typeof filters.entityType === 'string')
      where.entityType = filters.entityType;
    if (typeof filters.entityId === 'string') where.entityId = filters.entityId;
    if (typeof filters.actorUserId === 'string')
      where.actorUserId = filters.actorUserId;
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
    return rows.map((row) => ({
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
    }));
  }

  private async getTabularData(
    reportJob: ReportJob,
    filters: Record<string, unknown>,
  ): Promise<{
    columns: string[];
    rows: Array<Record<string, string | number>>;
  }> {
    switch (reportJob.reportType) {
      case 'SALES_SUMMARY':
      case 'SALES_DETAIL':
      case 'MARGIN_ANALYSIS':
      case 'PROFIT_AND_LOSS':
      case 'PAYMENT_RECONCILIATION':
      case 'ONLINE_ORDER_SUMMARY':
      case 'POS_SALES_SUMMARY':
      case 'INVENTORY_SUMMARY':
      case 'LOW_STOCK':
      case 'EXPIRING_BATCHES':
      case 'STOCK_MOVEMENT':
      case 'STOCK_TRANSFER':
      case 'PURCHASE_ORDER':
      case 'GOODS_RECEIPT': {
        const rows = await this.getKpiRows(reportJob, filters);
        return {
          columns: [
            'snapshotDate',
            'metricCode',
            'metricValue',
            'branchId',
            'warehouseId',
          ],
          rows,
        };
      }
      case 'AUDIT_LOG': {
        const rows = await this.getAuditRows(reportJob, filters);
        return {
          columns: [
            'createdAt',
            'serviceName',
            'module',
            'action',
            'entityType',
            'entityId',
            'actorUserId',
            'branchId',
            'warehouseId',
            'beforeData',
            'afterData',
          ],
          rows,
        };
      }
      case 'SETTINGS': {
        const rows = await this.prisma.setting.findMany({
          orderBy: [{ scope: 'asc' }, { key: 'asc' }],
          take: 5000,
        });
        return {
          columns: ['key', 'scope', 'branchId', 'value', 'updatedAt'],
          rows: rows.map((s) => ({
            key: s.key,
            scope: s.scope,
            branchId: s.branchId ?? '',
            value: JSON.stringify(s.value),
            updatedAt: s.updatedAt.toISOString(),
          })),
        };
      }
      default:
        return {
          columns: ['status', 'message'],
          rows: [
            {
              status: 'NOT_IMPLEMENTED',
              message: `Report type ${reportJob.reportType} is not fully implemented for export in foundation phase. No cross-service query is performed.`,
            },
          ],
        };
    }
  }

  private humanizeKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
  }

  private escapeCsvCell(value: unknown): string {
    const text = String(value ?? '');
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  private parseDate(input: unknown): Date | undefined {
    if (typeof input !== 'string') return undefined;
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
}
