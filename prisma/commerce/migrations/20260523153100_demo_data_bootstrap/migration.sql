-- Demo data bootstrap for commerce service

INSERT INTO "Category" ("id","name","slug","isActive","createdAt","updatedAt")
VALUES
  ('a1000000-0000-0000-0000-000000000001','Medicine','medicine',true,NOW(),NOW()),
  ('a1000000-0000-0000-0000-000000000002','Functional Food','functional-food',true,NOW(),NOW()),
  ('a1000000-0000-0000-0000-000000000003','Medical Equipment','medical-equipment',true,NOW(),NOW())
ON CONFLICT ("slug") DO UPDATE
SET "name" = EXCLUDED."name",
    "isActive" = true,
    "updatedAt" = NOW();

INSERT INTO "Brand" ("id","name","slug","country","isActive","createdAt","updatedAt")
VALUES
  ('a2000000-0000-0000-0000-000000000001','Internal Brand','internal-brand','VN',true,NOW(),NOW()),
  ('a2000000-0000-0000-0000-000000000002','Default Pharma','default-pharma','VN',true,NOW(),NOW())
ON CONFLICT ("slug") DO UPDATE
SET "name" = EXCLUDED."name",
    "country" = EXCLUDED."country",
    "isActive" = true,
    "updatedAt" = NOW();

INSERT INTO "Product" (
  "id","categoryId","brandId","sku","barcode","name","slug","description",
  "activeIngredient","dosageForm","strength","registrationNumber","requiresPrescription",
  "unit","basePrice","status","createdAt","updatedAt","deletedAt"
)
VALUES
  ('a3000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','PARA-500MG-TAB-01','8931001000001','Paracetamol 500mg','paracetamol-500mg','Pain reliever and fever reducer tablet','Paracetamol','Tablet','500mg','VN-REG-PARA-500',false,'box',25000,'ACTIVE',NOW(),NOW(),NULL),
  ('a3000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000002','AMOX-500MG-CAP-01','8931001000005','Amoxicillin 500mg','amoxicillin-500mg','Broad-spectrum antibiotic capsule','Amoxicillin','Capsule','500mg','VN-REG-AMOX-500',true,'box',68000,'ACTIVE',NOW(),NOW(),NULL),
  ('a3000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000002','a2000000-0000-0000-0000-000000000002','VITC-1000MG-EFF-01','8931001000002','Vitamin C 1000mg','vitamin-c-1000mg','Vitamin C supplement','Vitamin C','Effervescent Tablet','1000mg','VN-REG-VITC-1000',false,'tube',85000,'ACTIVE',NOW(),NOW(),NULL)
ON CONFLICT ("sku") DO UPDATE
SET "name" = EXCLUDED."name",
    "basePrice" = EXCLUDED."basePrice",
    "status" = EXCLUDED."status",
    "updatedAt" = NOW(),
    "deletedAt" = NULL;

INSERT INTO "Coupon" (
  "id","code","name","discountType","discountValue","minOrderAmount","maxDiscountAmount",
  "usageLimit","startsAt","endsAt","status","createdAt","updatedAt"
)
VALUES
  ('a4000000-0000-0000-0000-000000000001','WELCOME10','Welcome 10 Percent','PERCENTAGE',10,100000,50000,1000,'2025-12-31T00:00:00.000Z','2026-12-31T00:00:00.000Z','ACTIVE',NOW(),NOW()),
  ('a4000000-0000-0000-0000-000000000002','MOCK_FIXED','Mock Fixed Discount','FIXED_AMOUNT',30000,150000,NULL,500,'2025-12-31T00:00:00.000Z','2026-12-31T00:00:00.000Z','ACTIVE',NOW(),NOW())
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name",
    "status" = EXCLUDED."status",
    "updatedAt" = NOW();

INSERT INTO "OnlineOrder" (
  "id","orderNo","userId","branchId","assignedWarehouseId","status","paymentStatus","fulfillmentStatus",
  "subtotal","discountTotal","shippingFee","grandTotal","customerName","customerPhone","shippingAddress","note","createdAt","updatedAt"
)
VALUES
  ('a5000000-0000-0000-0000-000000000001','ONL-2026-0001','70000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','COMPLETED','PAID','FULFILLED',110000,10000,15000,115000,'Customer Demo 1','0900000007','123 Demo Street, Ho Chi Minh City','Seeded paid order',NOW(),NOW()),
  ('a5000000-0000-0000-0000-000000000002','ONL-2026-0002','70000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111112','22222222-2222-2222-2222-222222222222','PENDING','PENDING','UNFULFILLED',42000,0,10000,52000,'Customer Demo 2','0900000018','456 Sample Road, Da Nang','Seeded pending order',NOW(),NOW())
ON CONFLICT ("orderNo") DO UPDATE
SET "status" = EXCLUDED."status",
    "paymentStatus" = EXCLUDED."paymentStatus",
    "fulfillmentStatus" = EXCLUDED."fulfillmentStatus",
    "updatedAt" = NOW();

INSERT INTO "Payment" ("id","onlineOrderId","method","provider","transactionNo","amount","status","paidAt","createdAt")
VALUES
  ('a6000000-0000-0000-0000-000000000001','a5000000-0000-0000-0000-000000000001','BANK_TRANSFER','VNPAY','VNPAY-DEMO-0001',115000,'PAID','2026-01-01T00:00:00.000Z',NOW())
ON CONFLICT ("id") DO UPDATE
SET "status" = EXCLUDED."status",
    "paidAt" = EXCLUDED."paidAt";
