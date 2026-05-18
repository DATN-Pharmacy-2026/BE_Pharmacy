# RBAC Model (Phase R1)

## Roles
- `SUPER_ADMIN`
- `COMPANY_ADMIN`
- `BRANCH_MANAGER`
- `PHARMACIST`
- `CASHIER`
- `INVENTORY_MANAGER`
- `REPORT_VIEWER`
- `CUSTOMER_SERVICE`
- `CUSTOMER`

## Key Permissions
- Area access: `admin.access`, `pos.access`
- Inventory split:
  - `inventory.view`: admin inventory management
  - `inventory.lookup`: POS-safe stock lookup

## Important Rules
- `CASHIER` has `pos.access`, `pos.sell`, `pos.refund`, shift permissions, `inventory.lookup`.
- `CASHIER` does **not** have `admin.access`.
- `CASHIER` does **not** have `inventory.view`.
- `CUSTOMER` has only `customer.order.create`, `customer.order.view_self`.
- `CUSTOMER` does **not** have `admin.access` and `pos.access`.

## Role-Permission Matrix (high level)
- `SUPER_ADMIN`: all permissions.
- `COMPANY_ADMIN`: full company admin operations.
- `BRANCH_MANAGER`: branch-level admin + operations + reports.
- `PHARMACIST`: POS selling + stock lookup + batch/order read.
- `CASHIER`: POS and shift operations only (+ stock lookup).
- `INVENTORY_MANAGER`: inventory/receipt/batch operations + reporting.
- `REPORT_VIEWER`: reports + audit only.
- `CUSTOMER_SERVICE`: user read + order/payment/notification support.
- `CUSTOMER`: customer-facing order permissions only.

## Demo Accounts
- `admin@pharmplus.local` -> `SUPER_ADMIN`
- `company.admin@pharmplus.local` -> `COMPANY_ADMIN`
- `manager.branch1@pharmplus.local` -> `BRANCH_MANAGER`
- `cashier.branch1@pharmplus.local` -> `CASHIER`
- `inventory.branch1@pharmplus.local` -> `INVENTORY_MANAGER`
- `report.viewer@pharmplus.local` -> `REPORT_VIEWER`
- `cs.branch1@pharmplus.local` -> `CUSTOMER_SERVICE`
- `customer1@pharmplus.local` -> `CUSTOMER`
- `pharmacist.branch1@pharmplus.local` -> `PHARMACIST`

Default passwords are local demo values from seed env:
- `DEMO_ADMIN_PASSWORD` (default: `admin123`)
- `DEMO_SEED_PASSWORD` (default: `123456`)

## Seed Behavior
- Permissions: upsert by `code`
- Roles: upsert by `code`
- Role-permission mapping: per-role sync (`deleteMany` + `createMany(skipDuplicates)`)
- Demo users: upsert by `email`, user roles and scope accesses are refreshed each run

This is idempotent and safe for repeated local demo seeding.

## Manual Verification
After `npm run prisma:seed:identity`:
1. `CASHIER` has `pos.access`, `pos.sell`, `inventory.lookup`.
2. `CASHIER` lacks `admin.access`, `inventory.view`.
3. `CUSTOMER` lacks `admin.access`, `pos.access`.
4. `BRANCH_MANAGER` has `admin.access` and `inventory.view`.
5. `REPORT_VIEWER` has `report.view` and `report.export`.

## Scope Model
- Phase R2 adds full `/api/auth/me` context (roles, permissions, scope modes, assignments, access flags).
- See [RBAC_SCOPE_MODEL.md](./RBAC_SCOPE_MODEL.md).

## Next Phase
- Phase R3: route guard + menu permission enforcement using `/me` context.
