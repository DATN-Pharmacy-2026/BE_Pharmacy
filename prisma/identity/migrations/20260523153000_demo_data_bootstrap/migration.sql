-- Demo data bootstrap for identity service
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Roles
INSERT INTO "Role" ("id","code","name","scope","isSystemRole","createdAt","updatedAt")
VALUES
  ('50000000-0000-0000-0000-000000000001','SUPER_ADMIN','Super Admin','SYSTEM',true,NOW(),NOW()),
  ('50000000-0000-0000-0000-000000000002','PHARMACIST','Pharmacist','BRANCH',false,NOW(),NOW()),
  ('50000000-0000-0000-0000-000000000003','CUSTOMER','Customer','SYSTEM',false,NOW(),NOW()),
  ('50000000-0000-0000-0000-000000000004','CUSTOMER_SERVICE','Customer Service','BRANCH',false,NOW(),NOW())
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name",
    "scope" = EXCLUDED."scope",
    "isSystemRole" = EXCLUDED."isSystemRole",
    "updatedAt" = NOW();

-- Permissions (core full-flow)
INSERT INTO "Permission" ("id","code","name","module","action","createdAt","updatedAt")
VALUES
  ('51000000-0000-0000-0000-000000000001','admin.access','Access Admin Area','admin','access',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000002','user.view','View Users','user','view',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000003','role.view','View Roles','role','view',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000004','role.manage','Manage Roles','role','manage',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000005','catalog.view','View Catalog','catalog','view',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000006','catalog.create','Create Catalog','catalog','create',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000007','catalog.update','Update Catalog','catalog','update',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000008','catalog.delete','Delete Catalog','catalog','delete',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000009','order.view','View Orders','order','view',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000010','payment.view','View Payments','payment','view',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000011','payment.manage','Manage Payments','payment','manage',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000012','branch.view','View Branches','branch','view',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000013','warehouse.view','View Warehouses','warehouse','view',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000014','inventory.view','View Inventory','inventory','view',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000015','batch.view','View Batches','batch','view',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000016','purchase_request.view','View Purchase Request','purchase_request','view',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000017','goods_receipt.view','View Goods Receipt','goods_receipt','view',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000018','inventory.transfer','Transfer Inventory','inventory','transfer',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000019','pos.access','Access POS','pos','access',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000020','pos.sell','Sell POS','pos','sell',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000021','report.view','View Reports','report','view',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000022','report.export','Export Reports','report','export',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000023','notification.view','View Notifications','notification','view',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000024','notification.manage','Manage Notifications','notification','manage',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000025','audit.view','View Audit','audit','view',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000026','settings.view','View Settings','settings','view',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000027','settings.manage','Manage Settings','settings','manage',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000028','customer.order.create','Create Customer Order','customer.order','create',NOW(),NOW()),
  ('51000000-0000-0000-0000-000000000029','customer.order.view_self','View Own Orders','customer.order','view_self',NOW(),NOW())
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name",
    "module" = EXCLUDED."module",
    "action" = EXCLUDED."action",
    "updatedAt" = NOW();

-- Link SUPER_ADMIN with all permissions
INSERT INTO "RolePermission" ("id","roleId","permissionId","createdAt")
SELECT gen_random_uuid(), r."id", p."id", NOW()
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."code" = 'SUPER_ADMIN'
ON CONFLICT ("roleId","permissionId") DO NOTHING;

-- Link PHARMACIST permissions
INSERT INTO "RolePermission" ("id","roleId","permissionId","createdAt")
SELECT gen_random_uuid(), r."id", p."id", NOW()
FROM "Role" r
JOIN "Permission" p ON p."code" IN ('pos.access','pos.sell','inventory.view','inventory.transfer','batch.view')
WHERE r."code" = 'PHARMACIST'
ON CONFLICT ("roleId","permissionId") DO NOTHING;

-- Link CUSTOMER permissions
INSERT INTO "RolePermission" ("id","roleId","permissionId","createdAt")
SELECT gen_random_uuid(), r."id", p."id", NOW()
FROM "Role" r
JOIN "Permission" p ON p."code" IN ('customer.order.create','customer.order.view_self')
WHERE r."code" = 'CUSTOMER'
ON CONFLICT ("roleId","permissionId") DO NOTHING;

-- Demo users
INSERT INTO "User" ("id","username","email","phone","passwordHash","fullName","status","isSystemAdmin","createdAt","updatedAt")
VALUES
  ('60000000-0000-0000-0000-000000000001','admin','admin@pharmplus.local','0900000000','$2b$10$piShUwlrGnJ49lmHsWzk/OgApUfPI7QlCObXtdROjZo.qxidJsqoG','Super Admin Demo','ACTIVE',true,NOW(),NOW()),
  ('60000000-0000-0000-0000-000000000002','pharmacist.branch1','pharmacist.branch1@pharmplus.local','0900000008','$2b$10$VOljSmd3tPRx7/2EU.AX4ucV6eOb8s9GFyb/K4H8zvB25Xq4Irhky','Pharmacist Branch 1','ACTIVE',false,NOW(),NOW()),
  ('70000000-0000-0000-0000-000000000001','customer1','customer1@pharmplus.local','0900000007','$2b$10$VOljSmd3tPRx7/2EU.AX4ucV6eOb8s9GFyb/K4H8zvB25Xq4Irhky','Customer Demo 1','ACTIVE',false,NOW(),NOW())
ON CONFLICT ("username") DO UPDATE
SET "email" = EXCLUDED."email",
    "phone" = EXCLUDED."phone",
    "passwordHash" = EXCLUDED."passwordHash",
    "fullName" = EXCLUDED."fullName",
    "status" = EXCLUDED."status",
    "isSystemAdmin" = EXCLUDED."isSystemAdmin",
    "updatedAt" = NOW();

-- User roles
INSERT INTO "UserRole" ("id","userId","roleId","createdAt")
SELECT gen_random_uuid(), u."id", r."id", NOW()
FROM "User" u
JOIN "Role" r ON
  (u."username" = 'admin' AND r."code" = 'SUPER_ADMIN')
  OR (u."username" = 'pharmacist.branch1' AND r."code" = 'PHARMACIST')
  OR (u."username" = 'customer1' AND r."code" = 'CUSTOMER')
ON CONFLICT ("userId","roleId") DO NOTHING;
