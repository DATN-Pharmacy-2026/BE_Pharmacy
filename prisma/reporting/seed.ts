import {
  NotificationChannel,
  NotificationEventStatus,
  NotificationEventType,
  NotificationSeverity,
  Prisma,
  PrismaClient,
  ReportJobStatus,
  SettingScope,
} from '../../node_modules/.prisma/client/reporting';

const prisma = new PrismaClient();

function resolveSeedBaseDate(): Date {
  const fromEnv = process.env.SEED_BASE_DATE;
  const parsed = fromEnv ? new Date(fromEnv) : new Date('2026-01-01T00:00:00.000Z');
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid SEED_BASE_DATE. Use ISO format, e.g. 2026-01-01T00:00:00.000Z');
  }
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

async function main(): Promise<void> {
  const settings = [
    { key: 'system.language.default', value: 'vi' },
    { key: 'system.timezone', value: 'Asia/Ho_Chi_Minh' },
    { key: 'system.currency', value: 'VND' },
    { key: 'inventory.expiry.warningDays', value: 30 },
    { key: 'inventory.lowStock.defaultThreshold', value: 10 },
    { key: 'pos.receipt.footer', value: 'Cam on quy khach' },
  ];

  for (const setting of settings) {
    const existing = await prisma.setting.findFirst({
      where: {
        key: setting.key,
        scope: SettingScope.SYSTEM,
        branchId: null,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: { value: setting.value },
      });
      continue;
    }

    await prisma.setting.create({
      data: {
        key: setting.key,
        scope: SettingScope.SYSTEM,
        branchId: null,
        value: setting.value,
      },
    });
  }

  const today = resolveSeedBaseDate();
  const metricSeeds = [
    { metricCode: 'todayRevenue', metricValue: 0 },
    { metricCode: 'onlineOrders', metricValue: 0 },
    { metricCode: 'posOrders', metricValue: 0 },
    { metricCode: 'lowStockItems', metricValue: 0 },
    { metricCode: 'expiringSoonBatches', metricValue: 0 },
    { metricCode: 'pendingTransfers', metricValue: 0 },
    { metricCode: 'inventoryValue', metricValue: 0 },
    { metricCode: 'activeBranches', metricValue: 1 },
    { metricCode: 'totalProducts', metricValue: 0 },
    { metricCode: 'pendingPurchaseOrders', metricValue: 0 },
    { metricCode: 'pendingGoodsReceipts', metricValue: 0 },
  ];

  for (const metric of metricSeeds) {
    const existing = await prisma.kPISnapshot.findFirst({
      where: {
        branchId: null,
        warehouseId: null,
        metricCode: metric.metricCode,
        snapshotDate: today,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.kPISnapshot.update({
        where: { id: existing.id },
        data: { metricValue: metric.metricValue },
      });
      continue;
    }

    await prisma.kPISnapshot.create({
      data: {
        branchId: null,
        warehouseId: null,
        metricCode: metric.metricCode,
        metricValue: metric.metricValue,
        snapshotDate: today,
      },
    });
  }

  const reportSeeds = ['SALES_SUMMARY', 'INVENTORY_SUMMARY'];
  for (const reportType of reportSeeds) {
    const existing = await prisma.reportJob.findFirst({
      where: {
        reportType,
        requestedByUserId: '00000000-0000-0000-0000-000000000000',
        branchId: null,
        warehouseId: null,
      },
      select: { id: true },
    });

    if (existing) continue;

    await prisma.reportJob.create({
      data: {
        reportType,
        requestedByUserId: '00000000-0000-0000-0000-000000000000',
        branchId: null,
        warehouseId: null,
        status: ReportJobStatus.QUEUED,
        filters: {
          dateFrom: today.toISOString().slice(0, 10),
          dateTo: today.toISOString().slice(0, 10),
        },
      },
    });
  }

  const reportJob = await prisma.reportJob.findFirst({
    where: { reportType: 'SALES_SUMMARY' },
    orderBy: { createdAt: 'desc' },
  });

  if (reportJob) {
    const exportExists = await prisma.reportExport.findFirst({
      where: {
        reportJobId: reportJob.id,
        fileName: 'sales-summary-2026-01-01.csv',
      },
      select: { id: true },
    });

    if (!exportExists) {
      await prisma.reportExport.create({
        data: {
          reportJobId: reportJob.id,
          fileName: 'sales-summary-2026-01-01.csv',
          fileUrl: '/exports/sales-summary-2026-01-01.csv',
          fileType: 'csv',
        },
      });
    }
  }

  const notificationSeedDate = new Date(today.getTime() + 8 * 60 * 60 * 1000);
  await prisma.notificationEvent.upsert({
    where: { id: '91000000-0000-0000-0000-000000000001' },
    update: {
      type: NotificationEventType.REPORT_JOB_CREATED,
      channel: NotificationChannel.IN_APP,
      severity: NotificationSeverity.INFO,
      title: 'Bao cao da duoc tao',
      message: 'Yeu cau tao bao cao doanh so da duoc tiep nhan.',
      recipientUserId: '60000000-0000-0000-0000-000000000001',
      actorUserId: '60000000-0000-0000-0000-000000000001',
      branchId: null,
      warehouseId: null,
      sourceService: 'reporting-setting-service',
      sourceModule: 'reports',
      sourceEntityType: 'report_job',
      sourceEntityId: reportJob?.id ?? null,
      payload: { reportType: 'SALES_SUMMARY' },
      status: NotificationEventStatus.DELIVERED,
      deliveredAt: notificationSeedDate,
    },
    create: {
      id: '91000000-0000-0000-0000-000000000001',
      type: NotificationEventType.REPORT_JOB_CREATED,
      channel: NotificationChannel.IN_APP,
      severity: NotificationSeverity.INFO,
      title: 'Bao cao da duoc tao',
      message: 'Yeu cau tao bao cao doanh so da duoc tiep nhan.',
      recipientUserId: '60000000-0000-0000-0000-000000000001',
      actorUserId: '60000000-0000-0000-0000-000000000001',
      branchId: null,
      warehouseId: null,
      sourceService: 'reporting-setting-service',
      sourceModule: 'reports',
      sourceEntityType: 'report_job',
      sourceEntityId: reportJob?.id ?? null,
      payload: { reportType: 'SALES_SUMMARY' },
      status: NotificationEventStatus.DELIVERED,
      deliveredAt: notificationSeedDate,
      createdAt: notificationSeedDate,
    },
  });

  await prisma.auditLog.upsert({
    where: { id: '92000000-0000-0000-0000-000000000001' },
    update: {
      actorUserId: '60000000-0000-0000-0000-000000000001',
      branchId: '11111111-1111-1111-1111-111111111111',
      warehouseId: '22222222-2222-2222-2222-222222222222',
      serviceName: 'operation-service',
      module: 'goods-receipt',
      action: 'receive',
      entityType: 'goods_receipt',
      entityId: null,
      beforeData: Prisma.JsonNull,
      afterData: { receiptNo: 'GR-2026-0001', status: 'RECEIVED' },
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
    },
    create: {
      id: '92000000-0000-0000-0000-000000000001',
      actorUserId: '60000000-0000-0000-0000-000000000001',
      branchId: '11111111-1111-1111-1111-111111111111',
      warehouseId: '22222222-2222-2222-2222-222222222222',
      serviceName: 'operation-service',
      module: 'goods-receipt',
      action: 'receive',
      entityType: 'goods_receipt',
      entityId: null,
      beforeData: Prisma.JsonNull,
      afterData: { receiptNo: 'GR-2026-0001', status: 'RECEIVED' },
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
      createdAt: notificationSeedDate,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
