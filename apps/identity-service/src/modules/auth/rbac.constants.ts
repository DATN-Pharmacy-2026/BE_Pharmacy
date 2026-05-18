export const ROLE_CODES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  BRANCH_MANAGER: 'BRANCH_MANAGER',
  PHARMACIST: 'PHARMACIST',
  CASHIER: 'CASHIER',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  REPORT_VIEWER: 'REPORT_VIEWER',
  CUSTOMER_SERVICE: 'CUSTOMER_SERVICE',
  CUSTOMER: 'CUSTOMER',
} as const;

export const PERMISSION_CODES = {
  ADMIN_ACCESS: 'admin.access',
  POS_ACCESS: 'pos.access',
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_LOOKUP: 'inventory.lookup',
  POS_SELL: 'pos.sell',
  POS_REFUND: 'pos.refund',
  REPORT_VIEW: 'report.view',
  REPORT_EXPORT: 'report.export',
  CUSTOMER_ORDER_CREATE: 'customer.order.create',
  CUSTOMER_ORDER_VIEW_SELF: 'customer.order.view_self',
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];
export type PermissionCode = (typeof PERMISSION_CODES)[keyof typeof PERMISSION_CODES];
