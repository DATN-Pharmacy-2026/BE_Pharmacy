import {
  AUTH_ROUTES,
  COMMERCE_ROUTES,
  IDENTITY_EVENT_ROUTES,
  IDENTITY_ROUTES,
  NOTIFICATION_ROUTES,
  OPERATION_ROUTES,
  REPORTING_ROUTES,
} from './gateway-routes.contract';

export interface ApiGroupContract {
  group: string;
  description: string;
  routes: readonly string[];
  targetService:
    | 'identity-service'
    | 'commerce-service'
    | 'operation-service'
    | 'reporting-setting-service'
    | 'notification-service';
  authRequired: boolean;
}

export const API_GROUPS: ApiGroupContract[] = [
  {
    group: 'auth proxy',
    description: 'Authentication routes proxied to identity-service.',
    routes: AUTH_ROUTES,
    targetService: 'identity-service',
    authRequired: false,
  },
  {
    group: 'identity proxy',
    description: 'Identity management routes proxied to identity-service.',
    routes: IDENTITY_ROUTES,
    targetService: 'identity-service',
    authRequired: true,
  },
  {
    group: 'identity events proxy',
    description: 'Event failure/replay admin routes proxied to identity-service.',
    routes: IDENTITY_EVENT_ROUTES,
    targetService: 'identity-service',
    authRequired: true,
  },
  {
    group: 'commerce proxy',
    description:
      'Catalog, cart, order and payment routes proxied to commerce-service.',
    routes: COMMERCE_ROUTES,
    targetService: 'commerce-service',
    authRequired: true,
  },
  {
    group: 'operation proxy',
    description:
      'Branch, warehouse, inventory, procurement and POS routes proxied to operation-service.',
    routes: OPERATION_ROUTES,
    targetService: 'operation-service',
    authRequired: true,
  },
  {
    group: 'reporting proxy',
    description:
      'Settings, audit and reporting routes proxied to reporting-setting-service.',
    routes: REPORTING_ROUTES,
    targetService: 'reporting-setting-service',
    authRequired: true,
  },
  {
    group: 'notification proxy',
    description: 'Notification routes proxied to notification-service.',
    routes: NOTIFICATION_ROUTES,
    targetService: 'notification-service',
    authRequired: true,
  },
];
