# RBAC Scope Model (Phase R2)

## 1) `/api/auth/me` response

`GET /api/auth/me` now returns:

- User identity: `id`, `name`, `username`, `email`, `status`, `avatarUrl`
- Roles: `roles[]` with `{ code, name }`
- Permissions: flattened unique `permissions[]`
- Scope:
  - `branchScopeMode`: `ALL | ASSIGNED | NONE`
  - `warehouseScopeMode`: `ALL | ASSIGNED | NONE`
  - `branches[]`: active branch assignments
  - `warehouses[]`: active warehouse assignments
  - `defaultBranchId`
  - `defaultWarehouseId`
- Access flags:
  - `access.canAccessAdmin`
  - `access.canAccessPos`

Sensitive fields are not returned (`passwordHash`, refresh token data, secrets).

## 2) Permission vs scope

- Permissions decide **what** a user may do (e.g. `inventory.adjust`, `pos.sell`).
- Scope decides **where** a user may do it (all branches, assigned branches, or none).

## 3) Scope modes

- `ALL`: system/company-wide scope.
- `ASSIGNED`: only explicit active assignments from identity DB.
- `NONE`: no operational scope.

## 4) Role scope rules

- `SUPER_ADMIN`, `COMPANY_ADMIN`: `ALL` branch + warehouse scope.
- `CUSTOMER`: `NONE` branch + warehouse scope.
- Other operational roles: `ASSIGNED` when active assignment exists, otherwise `NONE`.

## 5) Demo scope expectations

- `admin@pharmplus.local`: ALL / ALL, admin access true.
- `cashier.branch1@pharmplus.local`: ASSIGNED / ASSIGNED, POS access true, admin access false.
- `customer1@pharmplus.local`: NONE / NONE, admin/POS access false.

## 6) Assignment storage model

Identity service uses logical access tables:

- `UserBranchAccess`
- `UserWarehouseAccess`

These store logical IDs only. Source of truth for branch/warehouse master data remains operation-service.

## 7) Cross-service boundary

- No FK from identity DB to operation DB.
- No direct identity query to operation-service database.

## 8) Verification checklist

1. Login with demo account.
2. Call `GET /api/auth/me`.
3. Verify roles, permissions, scope modes, assignments, and access flags.
4. Ensure permissions are unique and only ACTIVE assignments appear.

## 9) Next phase

Phase R3: Route guard and menu permission enforcement based on this `/me` context.
