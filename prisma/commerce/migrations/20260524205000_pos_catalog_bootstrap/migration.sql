-- POS catalog bootstrap (idempotent)

INSERT INTO "Category" ("id","name","slug","isActive","createdAt","updatedAt")
VALUES
  ('a1000000-0000-0000-0000-000000000001','Medicine','medicine',true,NOW(),NOW()),
  ('a1000000-0000-0000-0000-000000000002','Functional Food','functional-food',true,NOW(),NOW())
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
  "indication","activeIngredient","dosageForm","strength","registrationNumber",
  "requiresPrescription","unit","basePrice","status","createdAt","updatedAt","deletedAt"
)
VALUES
  ('a3000000-0000-0000-0000-000000000010','a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000002','AMOX-500MG-CAP-01','8931001000005','Amoxicillin 500mg','amoxicillin-500mg','Broad-spectrum antibiotic capsule','Nhiem khuan duong ho hap, nhiem khuan tai mui hong','Amoxicillin','Capsule','500mg','VN-REG-AMOX-500',true,'bottle',68000,'ACTIVE',NOW(),NOW(),NULL),
  ('a3000000-0000-0000-0000-000000000100','a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','DEMO-PROD-100','89990001100','Demo Product 100','demo-product-100','San pham demo cho POS','San pham noi bat tu nha thuoc','Active Ingredient 100','Tablet','500mg','VN-DEMO-100',false,'bottle',365000,'ACTIVE',NOW(),NOW(),NULL),
  ('a3000000-0000-0000-0000-000000000099','a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000002','DEMO-PROD-099','89990001099','Demo Product 099','demo-product-099','San pham demo cho POS','San pham noi bat tu nha thuoc','Active Ingredient 099','Tablet','450mg','VN-DEMO-099',false,'box',361500,'ACTIVE',NOW(),NOW(),NULL),
  ('a3000000-0000-0000-0000-000000000098','a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000002','DEMO-PROD-098','89990001098','Demo Product 098','demo-product-098','San pham demo cho POS','San pham noi bat tu nha thuoc','Active Ingredient 098','Tablet','400mg','VN-DEMO-098',false,'box',358000,'ACTIVE',NOW(),NOW(),NULL),
  ('a3000000-0000-0000-0000-000000000097','a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000002','DEMO-PROD-097','89990001097','Demo Product 097','demo-product-097','San pham demo cho POS','San pham noi bat tu nha thuoc','Active Ingredient 097','Tablet','350mg','VN-DEMO-097',false,'box',354500,'ACTIVE',NOW(),NOW(),NULL)
ON CONFLICT ("sku") DO UPDATE
SET "name" = EXCLUDED."name",
    "barcode" = EXCLUDED."barcode",
    "basePrice" = EXCLUDED."basePrice",
    "unit" = EXCLUDED."unit",
    "status" = EXCLUDED."status",
    "description" = EXCLUDED."description",
    "indication" = EXCLUDED."indication",
    "updatedAt" = NOW(),
    "deletedAt" = NULL;
