import { AppEnvironment } from '@app/common';

const parsePort = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? `${fallback}`, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const configuration = () => ({
  app: {
    nodeEnv:
      (process.env.NODE_ENV as AppEnvironment) ?? AppEnvironment.Development,
  },
  ports: {
    gateway: parsePort(process.env.GATEWAY_PORT, 3000),
    identityService: parsePort(process.env.IDENTITY_SERVICE_PORT, 3001),
    commerceService: parsePort(process.env.COMMERCE_SERVICE_PORT, 3002),
    operationService: parsePort(process.env.OPERATION_SERVICE_PORT, 3003),
    reportingSettingService: parsePort(
      process.env.REPORTING_SETTING_SERVICE_PORT,
      3004,
    ),
    notificationService: parsePort(process.env.NOTIFICATION_SERVICE_PORT, 3005),
  },
  databases: {
    identity: process.env.IDENTITY_DATABASE_URL,
    commerce: process.env.COMMERCE_DATABASE_URL,
    operation: process.env.OPERATION_DATABASE_URL,
    reportingSetting:
      process.env.REPORTING_SETTING_DATABASE_URL ??
      process.env.REPORTING_DATABASE_URL,
    notification: process.env.NOTIFICATION_DATABASE_URL,
  },
  auth: {
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    bcryptSaltRounds: parsePort(process.env.BCRYPT_SALT_ROUNDS, 10),
  },
  gateway: {
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:4008',
    corsOrigins:
      process.env.CORS_ORIGINS ??
      `${process.env.FRONTEND_URL ?? 'http://localhost:4008'},http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000`,
    proxyTimeoutMs: parsePort(process.env.GATEWAY_PROXY_TIMEOUT_MS, 10000),
    services: {
      identity: process.env.IDENTITY_SERVICE_URL ?? 'http://localhost:3001',
      commerce: process.env.COMMERCE_SERVICE_URL ?? 'http://localhost:3002',
      operation: process.env.OPERATION_SERVICE_URL ?? 'http://localhost:3003',
      reportingSetting:
        process.env.REPORTING_SETTING_SERVICE_URL ?? 'http://localhost:3004',
      notification:
        process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3005',
      chatbot: process.env.CHATBOT_SERVICE_URL ?? 'http://localhost:3006',
    },
  },
  logging: {
    level: process.env.LOG_LEVEL ?? 'info',
    enableRequestLogging:
      (process.env.ENABLE_REQUEST_LOGGING ?? 'true').toLowerCase() === 'true',
  },
  events: {
    retryEnabled: (process.env.EVENT_RETRY_ENABLED ?? 'true').toLowerCase() === 'true',
    retryStrategy: process.env.EVENT_RETRY_STRATEGY ?? 'delay-buckets',
    retryMaxAttempts: parsePort(process.env.EVENT_RETRY_MAX_ATTEMPTS, 4),
    retryBackoffMs: process.env.EVENT_RETRY_BACKOFF_MS ?? '5000,30000,120000,600000',
    retryJitterEnabled: (process.env.EVENT_RETRY_JITTER_ENABLED ?? 'true').toLowerCase() === 'true',
    retryJitterRatio: Number.parseFloat(process.env.EVENT_RETRY_JITTER_RATIO ?? '0.2'),
    dlqEnabled: (process.env.EVENT_DLQ_ENABLED ?? 'true').toLowerCase() === 'true',
    dlqExchange: process.env.EVENT_DLQ_EXCHANGE ?? 'pharmacy.events.dlx',
    retryExchange: process.env.EVENT_RETRY_EXCHANGE ?? 'pharmacy.events.retry',
    replayEnabled: (process.env.EVENT_REPLAY_ENABLED ?? 'true').toLowerCase() === 'true',
    replayMaxBatchSize: parsePort(process.env.EVENT_REPLAY_MAX_BATCH_SIZE, 50),
    failureRetentionDays: parsePort(process.env.EVENT_FAILURE_RETENTION_DAYS, 30),
    payloadPreviewMaxChars: parsePort(process.env.EVENT_DLQ_PAYLOAD_PREVIEW_MAX_CHARS, 4000),
    adminEndpointsEnabled: (process.env.EVENT_ADMIN_ENDPOINTS_ENABLED ?? 'true').toLowerCase() === 'true',
  },
});

export type AppConfiguration = ReturnType<typeof configuration>;
