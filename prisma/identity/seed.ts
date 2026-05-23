import { PrismaClient, RoleScope, UserStatus, AccessStatus } from '../../node_modules/.prisma/client/identity';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BRANCH_1_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_2_ID = '11111111-1111-1111-1111-111111111112';
const WAREHOUSE_1_ID = '22222222-2222-2222-2222-222222222222';
const WAREHOUSE_2_ID = '22222222-2222-2222-2222-222222222223';

type RoleCode =
  | 'SUPER_ADMIN'
  | 'COMPANY_ADMIN'
  | 'BRANCH_MANAGER'
  | 'PHARMACIST'
  | 'CASHIER'
  | 'INVENTORY_MANAGER'
  | 'REPORT_VIEWER'
  | 'CUSTOMER_SERVICE'
  | 'CUSTOMER';

const ROLES: Array<{ code: RoleCode; name: string; scope: RoleScope; isSystemRole: boolean }> = [
  { code: 'SUPER_ADMIN', name: 'Super Admin', scope: RoleScope.SYSTEM, isSystemRole: true },
  { code: 'COMPANY_ADMIN', name: 'Company Admin', scope: RoleScope.SYSTEM, isSystemRole: true },
  { code: 'BRANCH_MANAGER', name: 'Branch Manager', scope: RoleScope.BRANCH, isSystemRole: false },
  { code: 'PHARMACIST', name: 'Pharmacist', scope: RoleScope.BRANCH, isSystemRole: false },
  { code: 'CASHIER', name: 'Cashier', scope: RoleScope.BRANCH, isSystemRole: false },
  { code: 'INVENTORY_MANAGER', name: 'Inventory Manager', scope: RoleScope.WAREHOUSE, isSystemRole: false },
  { code: 'REPORT_VIEWER', name: 'Report Viewer', scope: RoleScope.SYSTEM, isSystemRole: false },
  { code: 'CUSTOMER_SERVICE', name: 'Customer Service', scope: RoleScope.BRANCH, isSystemRole: false },
  { code: 'CUSTOMER', name: 'Customer', scope: RoleScope.SYSTEM, isSystemRole: false },
];

const PERMISSIONS = [
  { code: 'admin.access', name: 'Access Admin Area', module: 'admin', action: 'access' },
  { code: 'pos.access', name: 'Access POS Area', module: 'pos', action: 'access' },

  { code: 'user.view', name: 'View Users', module: 'user', action: 'view' },
  { code: 'user.create', name: 'Create User', module: 'user', action: 'create' },
  { code: 'user.update', name: 'Update User', module: 'user', action: 'update' },
  { code: 'user.disable', name: 'Disable User', module: 'user', action: 'disable' },
  { code: 'user.assign_role', name: 'Assign User Role', module: 'user', action: 'assign_role' },
  { code: 'user.assign_scope', name: 'Assign User Scope', module: 'user', action: 'assign_scope' },
  { code: 'user.reset_password', name: 'Reset User Password', module: 'user', action: 'reset_password' },

  { code: 'role.view', name: 'View Roles', module: 'role', action: 'view' },
  { code: 'role.manage', name: 'Manage Roles', module: 'role', action: 'manage' },

  { code: 'branch.view', name: 'View Branches', module: 'branch', action: 'view' },
  { code: 'branch.manage', name: 'Manage Branches', module: 'branch', action: 'manage' },
  { code: 'warehouse.view', name: 'View Warehouses', module: 'warehouse', action: 'view' },
  { code: 'warehouse.manage', name: 'Manage Warehouses', module: 'warehouse', action: 'manage' },

  { code: 'catalog.view', name: 'View Catalog', module: 'catalog', action: 'view' },
  { code: 'catalog.create', name: 'Create Catalog Item', module: 'catalog', action: 'create' },
  { code: 'catalog.update', name: 'Update Catalog Item', module: 'catalog', action: 'update' },
  { code: 'catalog.delete', name: 'Delete Catalog Item', module: 'catalog', action: 'delete' },

  { code: 'order.view', name: 'View Orders', module: 'order', action: 'view' },
  { code: 'order.update', name: 'Update Orders', module: 'order', action: 'update' },
  { code: 'order.cancel', name: 'Cancel Orders', module: 'order', action: 'cancel' },

  { code: 'payment.view', name: 'View Payments', module: 'payment', action: 'view' },
  { code: 'payment.manage', name: 'Manage Payments', module: 'payment', action: 'manage' },

  { code: 'inventory.view', name: 'View Inventory Management', module: 'inventory', action: 'view' },
  { code: 'inventory.lookup', name: 'Lookup Inventory Availability', module: 'inventory', action: 'lookup' },
  { code: 'inventory.adjust', name: 'Adjust Inventory', module: 'inventory', action: 'adjust' },
  { code: 'inventory.transfer', name: 'Transfer Inventory', module: 'inventory', action: 'transfer' },

  { code: 'batch.view', name: 'View Batches', module: 'batch', action: 'view' },
  { code: 'batch.manage', name: 'Manage Batches', module: 'batch', action: 'manage' },

  { code: 'purchase_request.view', name: 'View Purchase Requests', module: 'purchase_request', action: 'view' },
  { code: 'purchase_request.create', name: 'Create Purchase Requests', module: 'purchase_request', action: 'create' },
  { code: 'purchase_request.approve', name: 'Approve Purchase Requests', module: 'purchase_request', action: 'approve' },

  { code: 'goods_receipt.view', name: 'View Goods Receipts', module: 'goods_receipt', action: 'view' },
  { code: 'goods_receipt.create', name: 'Create Goods Receipts', module: 'goods_receipt', action: 'create' },

  { code: 'pos.sell', name: 'Sell POS Order', module: 'pos', action: 'sell' },
  { code: 'pos.refund', name: 'Refund POS Order', module: 'pos', action: 'refund' },
  { code: 'pos.shift.open', name: 'Open POS Shift', module: 'pos', action: 'shift.open' },
  { code: 'pos.shift.close', name: 'Close POS Shift', module: 'pos', action: 'shift.close' },
  { code: 'pos.shift.view', name: 'View POS Shift', module: 'pos', action: 'shift.view' },

  { code: 'report.view', name: 'View Reports', module: 'report', action: 'view' },
  { code: 'report.export', name: 'Export Reports', module: 'report', action: 'export' },
  { code: 'audit.view', name: 'View Audit Logs', module: 'audit', action: 'view' },

  { code: 'settings.view', name: 'View Settings', module: 'settings', action: 'view' },
  { code: 'settings.manage', name: 'Manage Settings', module: 'settings', action: 'manage' },

  { code: 'notification.view', name: 'View Notifications', module: 'notification', action: 'view' },
  { code: 'notification.manage', name: 'Manage Notifications', module: 'notification', action: 'manage' },

  { code: 'customer.order.create', name: 'Create Customer Order', module: 'customer.order', action: 'create' },
  { code: 'customer.order.view_self', name: 'View Own Customer Orders', module: 'customer.order', action: 'view_self' },
] as const;

const ROLE_PERMISSIONS: Record<RoleCode, string[]> = {
  SUPER_ADMIN: PERMISSIONS.map((p) => p.code),
  COMPANY_ADMIN: PERMISSIONS.map((p) => p.code),
  BRANCH_MANAGER: [
    'admin.access',
    'user.view',
    'branch.view',
    'warehouse.view',
    'catalog.view',
    'order.view', 'order.update',
    'payment.view',
    'inventory.view', 'inventory.lookup', 'inventory.adjust', 'inventory.transfer',
    'batch.view',
    'purchase_request.view', 'purchase_request.create',
    'goods_receipt.view', 'goods_receipt.create',
    'report.view', 'report.export',
    'audit.view',
    'notification.view',
  ],
  PHARMACIST: [
    'pos.access',
    'pos.sell',
    'pos.shift.open',
    'pos.shift.close',
    'pos.shift.view',
    'inventory.lookup',
  ],
  CASHIER: [
    'pos.access',
    'pos.sell',
    'pos.refund',
    'pos.shift.open',
    'pos.shift.close',
    'pos.shift.view',
    'inventory.lookup',
  ],
  INVENTORY_MANAGER: [
    'admin.access',
    'branch.view',
    'warehouse.view',
    'inventory.view', 'inventory.lookup', 'inventory.adjust', 'inventory.transfer',
    'batch.view', 'batch.manage',
    'purchase_request.view', 'purchase_request.create',
    'goods_receipt.view', 'goods_receipt.create',
    'report.view', 'report.export',
  ],
  REPORT_VIEWER: ['admin.access', 'report.view', 'report.export', 'audit.view'],
  CUSTOMER_SERVICE: [
    'admin.access',
    'customer.order.view_self',
    'customer.order.create',
    'notification.manage',
    'notification.view',
    'settings.view',
    'settings.manage',
    'audit.view',
    'pos.shift.view',
    'pos.shift.close',
    'pos.shift.open',
    'pos.access',
    'pos.refund',
    'pos.sell',
    'goods_receipt.create',
    'goods_receipt.view',
    'purchase_request.approve',
    'purchase_request.create',
    'purchase_request.view',
    'batch.manage',
    'batch.view',
    'inventory.lookup',
    'inventory.transfer',
    'inventory.adjust',
    'inventory.view',
    'payment.manage',
    'payment.view',
    'order.cancel',
    'order.update',
    'order.view',
    'catalog.delete',
    'catalog.update',
    'catalog.create',
    'catalog.view',
    'warehouse.manage',
    'warehouse.view',
    'branch.manage',
    'branch.view',
    'role.view',
    'role.manage',
  ],
  CUSTOMER: ['customer.order.create', 'customer.order.view_self'],
};

async function upsertRoles() {
  let updated = 0;
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, scope: role.scope, isSystemRole: role.isSystemRole },
      create: role,
    });
    updated++;
  }
  return updated;
}

async function upsertPermissions() {
  let updated = 0;
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { name: permission.name, module: permission.module, action: permission.action },
      create: permission,
    });
    updated++;
  }
  return updated;
}

async function syncRolePermissions() {
  const roles = await prisma.role.findMany({ select: { id: true, code: true } });
  const permissions = await prisma.permission.findMany({ select: { id: true, code: true } });

  const roleIdByCode = new Map(roles.map((r) => [r.code, r.id]));
  const permissionIdByCode = new Map(permissions.map((p) => [p.code, p.id]));

  let links = 0;
  for (const [roleCode, permissionCodes] of Object.entries(ROLE_PERMISSIONS) as Array<[RoleCode, string[]]>) {
    const roleId = roleIdByCode.get(roleCode);
    if (!roleId) continue;

    await prisma.rolePermission.deleteMany({ where: { roleId } });
    const data = permissionCodes
      .map((code) => permissionIdByCode.get(code))
      .filter((id): id is string => Boolean(id))
      .map((permissionId) => ({ roleId, permissionId }));

    if (data.length > 0) {
      const result = await prisma.rolePermission.createMany({ data, skipDuplicates: true });
      links += result.count;
    }
  }
  return links;
}

async function upsertDemoUsers(passwordHash: string, adminPasswordHash: string) {
  const roleIdByCode = new Map((await prisma.role.findMany({ select: { id: true, code: true } })).map((r) => [r.code, r.id]));

  const demoUsers: Array<{
    id: string;
    username: string;
    email: string;
    fullName: string;
    phone: string;
    roleCode: RoleCode;
    isSystemAdmin?: boolean;
    passwordHash?: string;
    branchIds: string[];
    warehouseIds: string[];
  }> = [
    { id: '60000000-0000-0000-0000-000000000001', username: 'admin', email: 'admin@pharmplus.local', fullName: 'Super Admin Demo', phone: '0900000000', roleCode: 'SUPER_ADMIN', isSystemAdmin: true, passwordHash: adminPasswordHash, branchIds: [BRANCH_1_ID, BRANCH_2_ID], warehouseIds: [WAREHOUSE_1_ID, WAREHOUSE_2_ID] },
    { id: '60000000-0000-0000-0000-000000000009', username: 'companyadmin', email: 'company.admin@pharmplus.local', fullName: 'Company Admin Demo', phone: '0900000001', roleCode: 'COMPANY_ADMIN', branchIds: [BRANCH_1_ID, BRANCH_2_ID], warehouseIds: [WAREHOUSE_1_ID, WAREHOUSE_2_ID] },
    { id: '60000000-0000-0000-0000-000000000003', username: 'manager.branch1', email: 'manager.branch1@pharmplus.local', fullName: 'Branch Manager Demo', phone: '0900000002', roleCode: 'BRANCH_MANAGER', branchIds: [BRANCH_1_ID], warehouseIds: [WAREHOUSE_1_ID] },
    { id: '60000000-0000-0000-0000-000000000002', username: 'cashier.branch1', email: 'cashier.branch1@pharmplus.local', fullName: 'Cashier Branch 1 Demo', phone: '0900000003', roleCode: 'CASHIER', branchIds: [BRANCH_1_ID], warehouseIds: [WAREHOUSE_1_ID] },
    { id: '60000000-0000-0000-0000-000000000004', username: 'inventory.branch1', email: 'inventory.branch1@pharmplus.local', fullName: 'Inventory Manager Branch 1 Demo', phone: '0900000004', roleCode: 'INVENTORY_MANAGER', branchIds: [BRANCH_1_ID], warehouseIds: [WAREHOUSE_1_ID, WAREHOUSE_2_ID] },
    { id: '60000000-0000-0000-0000-000000000005', username: 'report.viewer', email: 'report.viewer@pharmplus.local', fullName: 'Report Viewer Demo', phone: '0900000005', roleCode: 'REPORT_VIEWER', branchIds: [BRANCH_1_ID], warehouseIds: [WAREHOUSE_1_ID] },
    { id: '60000000-0000-0000-0000-000000000006', username: 'cs.branch1', email: 'cs.branch1@pharmplus.local', fullName: 'Customer Service Branch 1 Demo', phone: '0900000006', roleCode: 'CUSTOMER_SERVICE', branchIds: [BRANCH_1_ID], warehouseIds: [WAREHOUSE_1_ID] },
    { id: '70000000-0000-0000-0000-000000000001', username: 'customer1', email: 'customer1@pharmplus.local', fullName: 'Customer Demo 1', phone: '0900000007', roleCode: 'CUSTOMER', branchIds: [], warehouseIds: [] },
    { id: '70000000-0000-0000-0000-000000000002', username: 'customer2', email: 'customer2@pharmplus.local', fullName: 'Customer Demo 2', phone: '0900000018', roleCode: 'CUSTOMER', branchIds: [], warehouseIds: [] },
    { id: '60000000-0000-0000-0000-000000000008', username: 'pharmacist.branch1', email: 'pharmacist.branch1@pharmplus.local', fullName: 'Pharmacist Branch 1 Demo', phone: '0900000008', roleCode: 'PHARMACIST', branchIds: [BRANCH_1_ID], warehouseIds: [WAREHOUSE_1_ID] },
  ];

  let usersUpdated = 0;
  for (const demoUser of demoUsers) {
    const roleId = roleIdByCode.get(demoUser.roleCode);
    if (!roleId) continue;

    const existingByEmail = await prisma.user.findUnique({ where: { email: demoUser.email } });
    const existingByUsername = await prisma.user.findUnique({ where: { username: demoUser.username } });
    const existing = existingByEmail ?? existingByUsername;

    const payload = {
      username: demoUser.username,
      email: demoUser.email,
      fullName: demoUser.fullName,
      phone: demoUser.phone,
      passwordHash: demoUser.passwordHash ?? passwordHash,
      status: UserStatus.ACTIVE,
      isSystemAdmin: Boolean(demoUser.isSystemAdmin),
      deletedAt: null,
    };

    const user = existing
      ? await prisma.user.update({ where: { id: existing.id }, data: payload })
      : await prisma.user.create({ data: { id: demoUser.id, ...payload } });
    usersUpdated++;

    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    await prisma.userRole.createMany({ data: [{ userId: user.id, roleId }], skipDuplicates: true });

    await prisma.userBranchAccess.deleteMany({ where: { userId: user.id } });
    await prisma.userWarehouseAccess.deleteMany({ where: { userId: user.id } });

    if (demoUser.branchIds.length > 0) {
      await prisma.userBranchAccess.createMany({
        data: demoUser.branchIds.map((branchId, idx) => ({
          userId: user.id,
          branchId,
          roleId,
          canAccessPOS: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER', 'PHARMACIST', 'CASHIER'].includes(demoUser.roleCode),
          canManageInventory: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_MANAGER'].includes(demoUser.roleCode),
          canApproveTransfer: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_MANAGER'].includes(demoUser.roleCode),
          isDefaultBranch: idx === 0,
          status: AccessStatus.ACTIVE,
        })),
        skipDuplicates: true,
      });
    }

    if (demoUser.warehouseIds.length > 0) {
      await prisma.userWarehouseAccess.createMany({
        data: demoUser.warehouseIds.map((warehouseId) => ({
          userId: user.id,
          warehouseId,
          roleId,
          canReceiveStock: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_MANAGER'].includes(demoUser.roleCode),
          canTransferStock: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_MANAGER'].includes(demoUser.roleCode),
          canAdjustStock: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_MANAGER'].includes(demoUser.roleCode),
          status: AccessStatus.ACTIVE,
        })),
        skipDuplicates: true,
      });
    }
  }

  return usersUpdated;
}

async function main(): Promise<void> {
  const saltRounds = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10', 10);
  const defaultPassword = process.env.DEMO_SEED_PASSWORD ?? '123456';
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD ?? 'admin123';
  const defaultPasswordHash = await bcrypt.hash(defaultPassword, saltRounds);
  const adminPasswordHash = await bcrypt.hash(adminPassword, saltRounds);

  const rolesUpdated = await upsertRoles();
  const permissionsUpdated = await upsertPermissions();
  const rolePermissionLinksCreated = await syncRolePermissions();
  const usersUpdated = await upsertDemoUsers(defaultPasswordHash, adminPasswordHash);

  console.log('Identity RBAC seed completed.');
  console.log(`Roles upserted: ${rolesUpdated}`);
  console.log(`Permissions upserted: ${permissionsUpdated}`);
  console.log(`Role-permission links synced: ${rolePermissionLinksCreated}`);
  console.log(`Demo users upserted: ${usersUpdated}`);
  console.log(`Admin account: admin@pharmplus.local / ${adminPassword}`);
  console.log(`Other demo accounts password: ${defaultPassword}`);
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
