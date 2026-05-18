import { PrismaClient, ReportJobStatus, SettingScope } from '../../node_modules/.prisma/client/reporting';

const prisma = new PrismaClient();

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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
