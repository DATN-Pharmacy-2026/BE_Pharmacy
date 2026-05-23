-- Demo data bootstrap for operation service

INSERT INTO "Company" ("id","name","status","createdAt","updatedAt")
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Pharmacy Group','ACTIVE',NOW(),NOW())
ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "status" = EXCLUDED."status", "updatedAt" = NOW();

INSERT INTO "Branch" ("id","companyId","code","name","address","status","createdAt","updatedAt","deletedAt")
VALUES
  ('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','MAIN_BRANCH','Main Branch','Main Branch Address','ACTIVE',NOW(),NOW(),NULL),
  ('11111111-1111-1111-1111-111111111112','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','BRANCH_2','Branch 2','Branch 2 Address','ACTIVE',NOW(),NOW(),NULL)
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name", "address" = EXCLUDED."address", "status" = EXCLUDED."status", "deletedAt" = NULL, "updatedAt" = NOW();

INSERT INTO "Store" ("id","branchId","code","name","address","status","createdAt","updatedAt")
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','11111111-1111-1111-1111-111111111111','MAIN_STORE','Main Store','Main Store Address','ACTIVE',NOW(),NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc','11111111-1111-1111-1111-111111111112','BRANCH2_STORE','Branch 2 Store','Branch 2 Store Address','ACTIVE',NOW(),NOW())
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name", "address" = EXCLUDED."address", "status" = EXCLUDED."status", "updatedAt" = NOW();

INSERT INTO "Warehouse" ("id","branchId","code","name","type","isCentral","status","createdAt","updatedAt")
VALUES
  ('22222222-2222-2222-2222-222222222222',NULL,'CENTRAL_WAREHOUSE','Central Warehouse','CENTRAL',true,'ACTIVE',NOW(),NOW()),
  ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','MAIN_BRANCH_WAREHOUSE','Main Branch Warehouse','BRANCH',false,'ACTIVE',NOW(),NOW()),
  ('22222222-2222-2222-2222-222222222223','11111111-1111-1111-1111-111111111112','BRANCH2_WAREHOUSE','Branch 2 Warehouse','BRANCH',false,'ACTIVE',NOW(),NOW())
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name", "status" = EXCLUDED."status", "updatedAt" = NOW();

INSERT INTO "WarehouseLocation" ("id","warehouseId","code","name","type","status","createdAt","updatedAt")
VALUES
  ('c1000000-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','DEFAULT','Default Location','STORAGE','ACTIVE',NOW(),NOW()),
  ('c1000000-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333','SHELF-A','Shelf A','PICKING','ACTIVE',NOW(),NOW())
ON CONFLICT ("warehouseId","code") DO UPDATE
SET "name" = EXCLUDED."name", "status" = EXCLUDED."status", "updatedAt" = NOW();

INSERT INTO "POSTerminal" ("id","branchId","storeId","code","name","status","createdAt","updatedAt")
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc','11111111-1111-1111-1111-111111111111','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','POS-001','POS-001','ACTIVE',NOW(),NOW())
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name", "status" = EXCLUDED."status", "updatedAt" = NOW();

INSERT INTO "Supplier" ("id","code","name","status","createdAt","updatedAt")
VALUES
  ('d1000000-0000-0000-0000-000000000001','DEFAULT-SUPPLIER','Default Supplier','ACTIVE',NOW(),NOW()),
  ('d1000000-0000-0000-0000-000000000002','PHARMA-SUPPLIER','Pharma Supplier','ACTIVE',NOW(),NOW())
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name", "status" = EXCLUDED."status", "updatedAt" = NOW();

INSERT INTO "PurchaseOrder" ("id","poNo","supplierId","warehouseId","branchId","status","orderedByUserId","approvedByUserId","expectedDate","totalAmount","createdAt","updatedAt")
SELECT
  'd2000000-0000-0000-0000-000000000001',
  'PO-2026-0001',
  s."id",
  w."id",
  b."id",
  'APPROVED',
  '60000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  '2026-01-06T00:00:00.000Z'::timestamp,
  2000000,
  NOW(),
  NOW()
FROM "Supplier" s
JOIN "Warehouse" w ON w."code" = 'CENTRAL_WAREHOUSE'
JOIN "Branch" b ON b."code" = 'MAIN_BRANCH'
WHERE s."code" = 'DEFAULT-SUPPLIER'
ON CONFLICT ("poNo") DO UPDATE SET "status" = EXCLUDED."status", "updatedAt" = NOW();

INSERT INTO "GoodsReceipt" ("id","receiptNo","purchaseOrderId","supplierId","warehouseId","branchId","receivedByUserId","status","receivedAt","note","createdAt","updatedAt")
SELECT
  'd3000000-0000-0000-0000-000000000001',
  'GR-2026-0001',
  po."id",
  s."id",
  w."id",
  b."id",
  '60000000-0000-0000-0000-000000000001',
  'RECEIVED',
  '2026-01-01T00:00:00.000Z'::timestamp,
  'Seeded receipt',
  NOW(),
  NOW()
FROM "PurchaseOrder" po
JOIN "Supplier" s ON s."id" = po."supplierId"
JOIN "Warehouse" w ON w."id" = po."warehouseId"
LEFT JOIN "Branch" b ON b."id" = po."branchId"
WHERE po."poNo" = 'PO-2026-0001'
ON CONFLICT ("receiptNo") DO UPDATE SET "status" = EXCLUDED."status", "updatedAt" = NOW();

INSERT INTO "StockTransfer" ("id","transferNo","fromWarehouseId","toWarehouseId","fromBranchId","toBranchId","requestedByUserId","approvedByUserId","status","requestedAt","approvedAt","shippedAt")
SELECT
  'd4000000-0000-0000-0000-000000000001',
  'TR-2026-0001',
  wf."id",
  wt."id",
  wf."branchId",
  wt."branchId",
  '60000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  'SHIPPED',
  '2026-01-01T00:00:00.000Z'::timestamp,
  '2026-01-01T00:00:00.000Z'::timestamp,
  '2026-01-01T02:00:00.000Z'::timestamp
FROM "Warehouse" wf
JOIN "Warehouse" wt ON wt."code" = 'MAIN_BRANCH_WAREHOUSE'
WHERE wf."code" = 'CENTRAL_WAREHOUSE'
ON CONFLICT ("transferNo") DO UPDATE SET "status" = EXCLUDED."status";

INSERT INTO "POSSession" ("id","branchId","storeId","posTerminalId","cashierUserId","openingCash","openedAt","status")
SELECT
  '82000000-0000-0000-0000-000000000001',
  b."id",
  s."id",
  pt."id",
  '60000000-0000-0000-0000-000000000002',
  500000,
  '2026-01-01T00:00:00.000Z'::timestamp,
  'OPEN'
FROM "Branch" b
JOIN "Store" s ON s."code" = 'MAIN_STORE'
JOIN "POSTerminal" pt ON pt."code" = 'POS-001'
WHERE b."code" = 'MAIN_BRANCH'
ON CONFLICT ("id") DO UPDATE SET "status" = EXCLUDED."status";

INSERT INTO "POSOrder" ("id","orderNo","branchId","storeId","posTerminalId","posSessionId","cashierUserId","customerUserId","status","subtotal","discountTotal","taxTotal","grandTotal","createdAt")
SELECT
  'e1000000-0000-0000-0000-000000000001',
  'POS-2026-0001',
  ps."branchId",
  ps."storeId",
  ps."posTerminalId",
  ps."id",
  '60000000-0000-0000-0000-000000000002',
  '70000000-0000-0000-0000-000000000001',
  'COMPLETED',
  95000,
  5000,
  0,
  90000,
  '2026-01-01T00:00:00.000Z'::timestamp
FROM "POSSession" ps
WHERE ps."id" = '82000000-0000-0000-0000-000000000001'
ON CONFLICT ("orderNo") DO UPDATE SET "status" = EXCLUDED."status";

INSERT INTO "Receipt" ("id","receiptNo","posOrderId","onlineOrderId","branchId","storeId","issuedByUserId","totalAmount","issuedAt")
VALUES
  ('e2000000-0000-0000-0000-000000000001','RCP-2026-0001','e1000000-0000-0000-0000-000000000001','a5000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','60000000-0000-0000-0000-000000000002',90000,'2026-01-01T00:00:00.000Z')
ON CONFLICT ("receiptNo") DO UPDATE SET "totalAmount" = EXCLUDED."totalAmount", "issuedAt" = EXCLUDED."issuedAt";
