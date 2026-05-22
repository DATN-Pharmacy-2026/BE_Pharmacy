export const DASHBOARD_METRIC_CODES = [
  'todayRevenue',
  'onlineOrders',
  'posOrders',
  'lowStockItems',
  'expiringSoonBatches',
  'pendingTransfers',
  'inventoryValue',
  'activeBranches',
  'totalProducts',
  'pendingPurchaseOrders',
  'pendingGoodsReceipts',
] as const;

export type DashboardMetricCode = (typeof DASHBOARD_METRIC_CODES)[number];

export const DEFAULT_DASHBOARD_METRICS: Record<DashboardMetricCode, number> = {
  todayRevenue: 0,
  onlineOrders: 0,
  posOrders: 0,
  lowStockItems: 0,
  expiringSoonBatches: 0,
  pendingTransfers: 0,
  inventoryValue: 0,
  activeBranches: 0,
  totalProducts: 0,
  pendingPurchaseOrders: 0,
  pendingGoodsReceipts: 0,
};
