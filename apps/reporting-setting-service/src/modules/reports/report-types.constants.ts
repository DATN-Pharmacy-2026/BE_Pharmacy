export const REPORT_TYPES = [
  'SALES_SUMMARY',
  'ONLINE_ORDER_SUMMARY',
  'POS_SALES_SUMMARY',
  'INVENTORY_SUMMARY',
  'LOW_STOCK',
  'EXPIRING_BATCHES',
  'STOCK_MOVEMENT',
  'STOCK_TRANSFER',
  'PURCHASE_ORDER',
  'GOODS_RECEIPT',
  'AUDIT_LOG',
] as const;

export type SupportedReportType = (typeof REPORT_TYPES)[number];

export const REPORT_TYPE_DESCRIPTIONS: Record<SupportedReportType, string> = {
  SALES_SUMMARY: 'Sales summary report',
  ONLINE_ORDER_SUMMARY: 'Online order summary report',
  POS_SALES_SUMMARY: 'POS sales summary report',
  INVENTORY_SUMMARY: 'Inventory summary report',
  LOW_STOCK: 'Low stock report',
  EXPIRING_BATCHES: 'Expiring batches report',
  STOCK_MOVEMENT: 'Stock movement report',
  STOCK_TRANSFER: 'Stock transfer report',
  PURCHASE_ORDER: 'Purchase order report',
  GOODS_RECEIPT: 'Goods receipt report',
  AUDIT_LOG: 'Audit log report',
};
