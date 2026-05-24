import { PrismaClient, RoleScope, UserStatus, AccessStatus } from '../../node_modules/.prisma/client/identity';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BRANCH_1_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_2_ID = '11111111-1111-1111-1111-111111111112';
const WAREHOUSE_1_ID = '22222222-2222-2222-2222-222222222222';
const WAREHOUSE_2_ID = '22222222-2222-2222-2222-222222222223';

type RoleCode =
  | 'SUPER_ADMIN'
  | 'PHARMACIST'
  | 'CUSTOMER';

const ROLES: Array<{ code: RoleCode; name: string; scope: RoleScope; isSystemRole: boolean }> = [
  { code: 'SUPER_ADMIN', name: 'Super Admin / Admin', scope: RoleScope.SYSTEM, isSystemRole: true },
  { code: 'PHARMACIST', name: 'Pharmacist', scope: RoleScope.BRANCH, isSystemRole: false },
  { code: 'CUSTOMER', name: 'Customer', scope: RoleScope.SYSTEM, isSystemRole: false },
];

const PERMISSIONS = [
  { code: 'admin.access', name: 'Access Admin Area', module: 'admin', action: 'access' },
  { code: 'pos.access', name: 'Access POS Area', module: 'pos', action: 'access' },

  { code: 'permission.manage', name: 'Manage Permissions', module: 'permission', action: 'manage' },
  { code: 'role.manage', name: 'Manage Roles', module: 'role', action: 'manage' },
  { code: 'user.view', name: 'View Users', module: 'user', action: 'view' },
  { code: 'user.create', name: 'Create User', module: 'user', action: 'create' },
  { code: 'user.update', name: 'Update User', module: 'user', action: 'update' },
  { code: 'user.delete', name: 'Delete User', module: 'user', action: 'delete' },
  { code: 'customer.view', name: 'View Customers', module: 'customer', action: 'view' },
  { code: 'customer.create', name: 'Create Customer', module: 'customer', action: 'create' },

  { code: 'branch.view', name: 'View Branches', module: 'branch', action: 'view' },
  { code: 'branch.create', name: 'Create Branch', module: 'branch', action: 'create' },
  { code: 'branch.update', name: 'Update Branch', module: 'branch', action: 'update' },
  { code: 'branch.delete', name: 'Delete Branch', module: 'branch', action: 'delete' },
  { code: 'warehouse.view', name: 'View Warehouses', module: 'warehouse', action: 'view' },

  { code: 'product.view', name: 'View Products', module: 'product', action: 'view' },
  { code: 'product.search', name: 'Search Products', module: 'product', action: 'search' },
  { code: 'product.create', name: 'Create Product', module: 'product', action: 'create' },
  { code: 'product.update', name: 'Update Product', module: 'product', action: 'update' },
  { code: 'product.delete', name: 'Delete Product', module: 'product', action: 'delete' },

  { code: 'order.view', name: 'View Orders', module: 'order', action: 'view' },
  { code: 'order.update', name: 'Update Orders', module: 'order', action: 'update' },
  { code: 'order.cancel', name: 'Cancel Orders', module: 'order', action: 'cancel' },

  { code: 'payment.view', name: 'View Payments', module: 'payment', action: 'view' },
  { code: 'payment.update', name: 'Update Payments', module: 'payment', action: 'update' },
  { code: 'payment.refund', name: 'Refund Payments', module: 'payment', action: 'refund' },
  { code: 'customer.payment.create', name: 'Create Customer Payment', module: 'customer.payment', action: 'create' },
  { code: 'customer.payment.view_self', name: 'View Own Customer Payments', module: 'customer.payment', action: 'view_self' },

  { code: 'inventory.view', name: 'View Inventory', module: 'inventory', action: 'view' },
  { code: 'inventory.lookup', name: 'Lookup Inventory Availability', module: 'inventory', action: 'lookup' },
  { code: 'inventory.update', name: 'Update Inventory', module: 'inventory', action: 'update' },

  { code: 'batch.view', name: 'View Batches', module: 'batch', action: 'view' },
  { code: 'batch.manage', name: 'Manage Batches', module: 'batch', action: 'manage' },

  { code: 'purchase_request.view', name: 'View Purchase Requests', module: 'purchase_request', action: 'view' },
  { code: 'purchase_request.create', name: 'Create Purchase Requests', module: 'purchase_request', action: 'create' },
  { code: 'purchase_request.approve', name: 'Approve Purchase Requests', module: 'purchase_request', action: 'approve' },

  { code: 'goods_receipt.view', name: 'View Goods Receipts', module: 'goods_receipt', action: 'view' },
  { code: 'goods_receipt.create', name: 'Create Goods Receipts', module: 'goods_receipt', action: 'create' },

  { code: 'pos.sell', name: 'Sell POS Order', module: 'pos', action: 'sell' },
  { code: 'pos.refund', name: 'Refund POS Order', module: 'pos', action: 'refund' },
  { code: 'pos_order.view', name: 'View POS Orders', module: 'pos_order', action: 'view' },
  { code: 'pos_order.create', name: 'Create POS Orders', module: 'pos_order', action: 'create' },
  { code: 'pos_order.update', name: 'Update POS Orders', module: 'pos_order', action: 'update' },
  { code: 'pos_payment.view', name: 'View POS Payments', module: 'pos_payment', action: 'view' },
  { code: 'pos_payment.create', name: 'Create POS Payments', module: 'pos_payment', action: 'create' },
  { code: 'pos_payment.update', name: 'Update POS Payments', module: 'pos_payment', action: 'update' },
  { code: 'pos.shift.open', name: 'Open POS Shift', module: 'pos', action: 'shift.open' },
  { code: 'pos.shift.close', name: 'Close POS Shift', module: 'pos', action: 'shift.close' },
  { code: 'pos.shift.view', name: 'View POS Shift', module: 'pos', action: 'shift.view' },

  { code: 'report.view', name: 'View Reports', module: 'report', action: 'view' },
  { code: 'report.revenue', name: 'View Revenue Report', module: 'report', action: 'revenue' },
  { code: 'report.shift_revenue', name: 'View Shift Revenue Report', module: 'report', action: 'shift_revenue' },
  { code: 'report.export', name: 'Export Reports', module: 'report', action: 'export' },
  { code: 'audit.view', name: 'View Audit Logs', module: 'audit', action: 'view' },

  { code: 'customer.order.create', name: 'Create Customer Order', module: 'customer.order', action: 'create' },
  { code: 'customer.order.view_self', name: 'View Own Customer Orders', module: 'customer.order', action: 'view_self' },
  { code: 'customer.order.cancel_self', name: 'Cancel Own Customer Orders', module: 'customer.order', action: 'cancel_self' },
  { code: 'customer.profile.view_self', name: 'View Own Profile', module: 'customer.profile', action: 'view_self' },
  { code: 'customer.profile.update_self', name: 'Update Own Profile', module: 'customer.profile', action: 'update_self' },
] as const;

const ROLE_PERMISSIONS: Record<RoleCode, string[]> = {
  SUPER_ADMIN: PERMISSIONS.map((p) => p.code),
  PHARMACIST: [
    'pos.access',
    'pos.sell',
    'pos.refund',
    'pos_order.view',
    'pos_order.create',
    'pos_order.update',
    'pos_payment.view',
    'pos_payment.create',
    'pos_payment.update',
    'pos.shift.open',
    'pos.shift.close',
    'pos.shift.view',
    'product.view',
    'product.search',
    'inventory.view',
    'inventory.lookup',
    'customer.view',
    'customer.create',
    'report.shift_revenue',
  ],
  CUSTOMER: [
    'product.view',
    'product.search',
    'customer.order.create',
    'customer.order.view_self',
    'customer.order.cancel_self',
    'customer.profile.view_self',
    'customer.profile.update_self',
    'customer.payment.create',
    'customer.payment.view_self',
  ],
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
    { id: '60000000-0000-0000-0000-000000000008', username: 'pharmacist.branch1', email: 'pharmacist.branch1@pharmplus.local', fullName: 'Pharmacist Branch 1 Demo', phone: '0900000008', roleCode: 'PHARMACIST', branchIds: [BRANCH_1_ID], warehouseIds: [WAREHOUSE_1_ID] },
    { id: '70000000-0000-0000-0000-000000000001', username: 'customer1', email: 'customer1@pharmplus.local', fullName: 'Customer Demo 1', phone: '0900000007', roleCode: 'CUSTOMER', branchIds: [], warehouseIds: [] },
    { id: '70000000-0000-0000-0000-000000000002', username: 'customer2', email: 'customer2@pharmplus.local', fullName: 'Customer Demo 2', phone: '0900000018', roleCode: 'CUSTOMER', branchIds: [], warehouseIds: [] },
    { id: '70000000-0000-0000-0000-000000000003', username: 'nguyenvanan', email: 'nguyen.van.an@pharmplus.local', fullName: 'Nguyen Van An', phone: '0901111222', roleCode: 'CUSTOMER', branchIds: [], warehouseIds: [] },
    { id: '70000000-0000-0000-0000-000000000004', username: 'tranthibich', email: 'tran.thi.bich@pharmplus.local', fullName: 'Tran Thi Bich', phone: '0912345678', roleCode: 'CUSTOMER', branchIds: [], warehouseIds: [] },
    { id: '70000000-0000-0000-0000-000000000005', username: 'leminhkhoa', email: 'le.minh.khoa@pharmplus.local', fullName: 'Le Minh Khoa', phone: '0987654321', roleCode: 'CUSTOMER', branchIds: [], warehouseIds: [] },
    { id: '70000000-0000-0000-0000-000000000006', username: 'phamthuha', email: 'pham.thu.ha@pharmplus.local', fullName: 'Pham Thu Ha', phone: '0933111222', roleCode: 'CUSTOMER', branchIds: [], warehouseIds: [] },
    { id: '70000000-0000-0000-0000-000000000007', username: 'dangquanghuy', email: 'dang.quang.huy@pharmplus.local', fullName: 'Dang Quang Huy', phone: '0944555666', roleCode: 'CUSTOMER', branchIds: [], warehouseIds: [] },
    { id: '70000000-0000-0000-0000-000000000008', username: 'vothilan', email: 'vo.thi.lan@pharmplus.local', fullName: 'Vo Thi Lan', phone: '0977000111', roleCode: 'CUSTOMER', branchIds: [], warehouseIds: [] },
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
          canAccessPOS: ['SUPER_ADMIN', 'PHARMACIST'].includes(demoUser.roleCode),
          canManageInventory: ['SUPER_ADMIN'].includes(demoUser.roleCode),
          canApproveTransfer: ['SUPER_ADMIN'].includes(demoUser.roleCode),
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
          canReceiveStock: ['SUPER_ADMIN'].includes(demoUser.roleCode),
          canTransferStock: ['SUPER_ADMIN'].includes(demoUser.roleCode),
          canAdjustStock: ['SUPER_ADMIN'].includes(demoUser.roleCode),
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
