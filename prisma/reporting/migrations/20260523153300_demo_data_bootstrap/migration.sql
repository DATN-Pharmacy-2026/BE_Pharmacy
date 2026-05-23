-- Demo data bootstrap for reporting service

INSERT INTO "Setting" ("id","key","value","scope","branchId","createdAt","updatedAt")
VALUES
  ('f1000000-0000-0000-0000-000000000001','system.language.default','"vi"'::jsonb,'SYSTEM',NULL,NOW(),NOW()),
  ('f1000000-0000-0000-0000-000000000002','system.timezone','"Asia/Ho_Chi_Minh"'::jsonb,'SYSTEM',NULL,NOW(),NOW()),
  ('f1000000-0000-0000-0000-000000000003','pos.receipt.footer','"Cam on quy khach"'::jsonb,'SYSTEM',NULL,NOW(),NOW())
ON CONFLICT ("key","scope","branchId") DO UPDATE
SET "value" = EXCLUDED."value",
    "updatedAt" = NOW();

INSERT INTO "KPISnapshot" ("id","branchId","warehouseId","metricCode","metricValue","snapshotDate","createdAt")
VALUES
  ('f2000000-0000-0000-0000-000000000001',NULL,NULL,'todayRevenue',115000,'2026-01-01T00:00:00.000Z',NOW()),
  ('f2000000-0000-0000-0000-000000000002',NULL,NULL,'onlineOrders',2,'2026-01-01T00:00:00.000Z',NOW()),
  ('f2000000-0000-0000-0000-000000000003',NULL,NULL,'posOrders',1,'2026-01-01T00:00:00.000Z',NOW())
ON CONFLICT ("id") DO UPDATE
SET "metricValue" = EXCLUDED."metricValue";

INSERT INTO "ReportJob" ("id","reportType","requestedByUserId","branchId","warehouseId","status","filters","createdAt","completedAt")
VALUES
  ('f3000000-0000-0000-0000-000000000001','SALES_SUMMARY','60000000-0000-0000-0000-000000000001',NULL,NULL,'COMPLETED','{"dateFrom":"2026-01-01","dateTo":"2026-01-01"}'::jsonb,NOW(),NOW()),
  ('f3000000-0000-0000-0000-000000000002','INVENTORY_SUMMARY','60000000-0000-0000-0000-000000000001',NULL,NULL,'QUEUED','{"dateFrom":"2026-01-01","dateTo":"2026-01-01"}'::jsonb,NOW(),NULL)
ON CONFLICT ("id") DO UPDATE
SET "status" = EXCLUDED."status";

INSERT INTO "ReportExport" ("id","reportJobId","fileName","fileUrl","fileType","createdAt")
VALUES
  ('f4000000-0000-0000-0000-000000000001','f3000000-0000-0000-0000-000000000001','sales-summary-2026-01-01.csv','/exports/sales-summary-2026-01-01.csv','csv',NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "NotificationTemplate" (
  "id","code","eventType","channel","locale","subject","titleTemplate","messageTemplate","enabled","isDefault","createdAt","updatedAt"
)
VALUES
  ('f5000000-0000-0000-0000-000000000001','REPORT_JOB_CREATED_DEFAULT','REPORT_JOB_CREATED','IN_APP','vi',NULL,'Bao cao da duoc tao','Yeu cau tao bao cao {{reportType}} da duoc tiep nhan.',true,true,NOW(),NOW())
ON CONFLICT ("code") DO UPDATE
SET "enabled" = true,
    "updatedAt" = NOW();

INSERT INTO "NotificationEvent" (
  "id","type","channel","severity","title","message","recipientUserId","actorUserId","branchId","warehouseId",
  "sourceService","sourceModule","sourceEntityType","sourceEntityId","payload","status","deliveredAt","createdAt","updatedAt"
)
VALUES
  ('f6000000-0000-0000-0000-000000000001','REPORT_JOB_CREATED','IN_APP','INFO','Bao cao da duoc tao','Yeu cau tao bao cao doanh so da duoc tiep nhan.','60000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001',NULL,NULL,'reporting-setting-service','reports','report_job','f3000000-0000-0000-0000-000000000001','{"reportType":"SALES_SUMMARY"}'::jsonb,'DELIVERED','2026-01-01T08:00:00.000Z',NOW(),NOW())
ON CONFLICT ("id") DO UPDATE
SET "status" = EXCLUDED."status",
    "updatedAt" = NOW();

INSERT INTO "AuditLog" (
  "id","actorUserId","branchId","warehouseId","serviceName","module","action","entityType","entityId","beforeData","afterData","ipAddress","userAgent","createdAt"
)
VALUES
  ('f7000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','operation-service','goods-receipt','receive','goods_receipt',NULL,NULL,'{"receiptNo":"GR-2026-0001","status":"RECEIVED"}'::jsonb,'127.0.0.1','migration','2026-01-01T08:00:00.000Z')
ON CONFLICT ("id") DO NOTHING;
