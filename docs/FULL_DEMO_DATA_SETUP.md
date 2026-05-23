# Full Demo Data Setup

## Muc tieu
- Tao bo du lieu dong bo giua `identity`, `commerce`, `operation`, `reporting`, `notification`.
- Du de chay cac man: users/roles, products, orders, payments, inventory, batches, transfer, receipts, POS, reports, notifications, audit.

## Lenh chay
```bash
cd BE
set SEED_BASE_DATE=2026-01-01T00:00:00.000Z
set DEMO_ADMIN_PASSWORD=admin123
set DEMO_SEED_PASSWORD=123456
npm run prisma:migrate:all
npm run prisma:seed:all
```

PowerShell:
```powershell
cd BE
$env:SEED_BASE_DATE="2026-01-01T00:00:00.000Z"
$env:DEMO_ADMIN_PASSWORD="admin123"
$env:DEMO_SEED_PASSWORD="123456"
npm run prisma:migrate:all
npm run prisma:seed:all
```

## Tai khoan demo
- `admin` / `admin123` (SUPER_ADMIN)
- `companyadmin` / `123456`
- `manager.branch1` / `123456`
- `cashier.branch1` / `123456`
- `inventory.branch1` / `123456`
- `pharmacist.branch1` / `123456`
- `cs.branch1` / `123456`
- `customer1` / `123456`
- `customer2` / `123456`

## Du lieu da seed
- Branch/Warehouse:
  - `MAIN_BRANCH`, `BRANCH_2`
  - `CENTRAL_WAREHOUSE`, `MAIN_BRANCH_WAREHOUSE`, `BRANCH2_WAREHOUSE`
- Commerce:
  - product/category/brand/coupon
  - 1 cart active
  - 2 online orders (`ONL-2026-0001`, `ONL-2026-0002`)
  - payment cho order da thanh toan
- Operation:
  - purchase order `PO-2026-0001`
  - goods receipt `GR-2026-0001`
  - batch `BATCH-PARA-2601`
  - inventory + inventory item + stock movement
  - stock transfer `TR-2026-0001` + shipment `SHIP-2026-0001`
  - POS session open + POS order `POS-2026-0001` + receipt `RCP-2026-0001`
  - FEFO allocation mau
- Reporting:
  - KPI snapshot
  - report jobs
  - report export csv mau
  - notification event mau
  - audit log mau

## Quick smoke sau khi seed
```bash
npm run test:demo
```

Neu test login bi `429` do throttle:
- cho 5-10 giay roi chay lai test.
