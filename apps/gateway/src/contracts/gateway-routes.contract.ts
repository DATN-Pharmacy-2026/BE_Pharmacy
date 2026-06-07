export const AUTH_ROUTES = ['/api/auth/*'] as const;

export const IDENTITY_ROUTES = [
  '/api/users/*',
  '/api/roles/*',
  '/api/permissions/*',
  '/api/access/*',
  '/api/sessions/*',
] as const;

export const COMMERCE_ROUTES = [
  '/api/catalog/*',
  '/api/categories/*',
  '/api/brands/*',
  '/api/products/*',
  '/api/uploads/*',
  '/api/carts/*',
  '/api/checkout/*',
  '/api/orders/*',
  '/api/payments/*',
  '/api/payment-gateways/*',
  '/api/reviews/*',
  '/api/coupons/*',
  '/api/chatbot/*',
  '/api/commerce-events/*',
] as const;

export const OPERATION_ROUTES = [
  '/api/companies/*',
  '/api/branches/*',
  '/api/stores/*',
  '/api/warehouses/*',
  '/api/suppliers/*',
  '/api/purchase-orders/*',
  '/api/purchase-requests/*',
  '/api/goods-receipts/*',
  '/api/batches/*',
  '/api/inventories/*',
  '/api/inventory/*',
  '/api/public-inventory/*',
  '/api/stock-movements/*',
  '/api/stock-adjustments/*',
  '/api/stock-transfers/*',
  '/api/shipments/*',
  '/api/fefo/*',
  '/api/pos-terminals/*',
  '/api/pos-sessions/*',
  '/api/pos-orders/*',
  '/api/pos-payments/*',
  '/api/receipts/*',
  '/api/verification/*',
  '/api/operation-events/*',
] as const;

export const REPORTING_ROUTES = [
  '/api/settings/*',
  '/api/audit-logs/*',
  '/api/notification-events/*',
  '/api/notification-delivery/*',
  '/api/notification-preferences/*',
  '/api/notification-templates/*',
  '/api/reports/*',
  '/api/report-exports/*',
  '/api/dashboard/*',
  '/api/kpi/*',
  '/api/kpis/*',
  '/api/reporting-events/*',
] as const;

export const IDENTITY_EVENT_ROUTES = ['/api/identity-events/*'] as const;

export const NOTIFICATION_ROUTES = [
  '/api/notifications/*',
] as const;

export const CHATBOT_ROUTES = [
  '/api/chat/*',
  '/api/rag/*',
  '/api/handoff/*',
  '/api/health/*',
] as const;
