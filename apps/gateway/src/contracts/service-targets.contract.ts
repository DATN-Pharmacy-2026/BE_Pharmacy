export interface ServiceTargetContract {
  serviceName:
    | 'identity-service'
    | 'commerce-service'
    | 'operation-service'
    | 'reporting-setting-service'
    | 'notification-service';
  envKey:
    | 'IDENTITY_SERVICE_URL'
    | 'COMMERCE_SERVICE_URL'
    | 'OPERATION_SERVICE_URL'
    | 'REPORTING_SETTING_SERVICE_URL'
    | 'NOTIFICATION_SERVICE_URL';
  defaultUrl: string;
  healthPath: '/api/health';
}

export const SERVICE_TARGETS: ServiceTargetContract[] = [
  {
    serviceName: 'identity-service',
    envKey: 'IDENTITY_SERVICE_URL',
    defaultUrl: 'http://localhost:3001',
    healthPath: '/api/health',
  },
  {
    serviceName: 'commerce-service',
    envKey: 'COMMERCE_SERVICE_URL',
    defaultUrl: 'http://localhost:3002',
    healthPath: '/api/health',
  },
  {
    serviceName: 'operation-service',
    envKey: 'OPERATION_SERVICE_URL',
    defaultUrl: 'http://localhost:3003',
    healthPath: '/api/health',
  },
  {
    serviceName: 'reporting-setting-service',
    envKey: 'REPORTING_SETTING_SERVICE_URL',
    defaultUrl: 'http://localhost:3004',
    healthPath: '/api/health',
  },
  {
    serviceName: 'notification-service',
    envKey: 'NOTIFICATION_SERVICE_URL',
    defaultUrl: 'http://localhost:3005',
    healthPath: '/api/health',
  },
];
