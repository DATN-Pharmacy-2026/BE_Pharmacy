import * as Joi from 'joi';

const databaseUrlSchema = Joi.string().uri({
  scheme: ['postgresql', 'postgres'],
});

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const schema = Joi.object({
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .default('development'),
    GATEWAY_PORT: Joi.number().port().default(3000),
    IDENTITY_SERVICE_PORT: Joi.number().port().default(3001),
    COMMERCE_SERVICE_PORT: Joi.number().port().default(3002),
    OPERATION_SERVICE_PORT: Joi.number().port().default(3003),
    REPORTING_SETTING_SERVICE_PORT: Joi.number().port().default(3004),
    NOTIFICATION_SERVICE_PORT: Joi.number().port().default(3005),
    IDENTITY_SERVICE_URL: Joi.string()
      .uri({ scheme: ['http', 'https'] })
      .default('http://localhost:3001'),
    COMMERCE_SERVICE_URL: Joi.string()
      .uri({ scheme: ['http', 'https'] })
      .default('http://localhost:3002'),
    OPERATION_SERVICE_URL: Joi.string()
      .uri({ scheme: ['http', 'https'] })
      .default('http://localhost:3003'),
    REPORTING_SETTING_SERVICE_URL: Joi.string()
      .uri({ scheme: ['http', 'https'] })
      .default('http://localhost:3004'),
    NOTIFICATION_SERVICE_URL: Joi.string()
      .uri({ scheme: ['http', 'https'] })
      .default('http://localhost:3005'),
    FRONTEND_URL: Joi.string()
      .uri({ scheme: ['http', 'https'] })
      .default('http://localhost:4008'),
    CORS_ORIGINS: Joi.string().default('http://localhost:4000,http://127.0.0.1:4000,http://localhost:4008,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000'),
    GATEWAY_PROXY_TIMEOUT_MS: Joi.number().integer().min(1000).default(10000),
    GATEWAY_THROTTLE_TTL_MS: Joi.number().integer().min(1000).default(60000),
    GATEWAY_THROTTLE_LIMIT: Joi.number().integer().min(1).default(1000),
    IDENTITY_THROTTLE_TTL_MS: Joi.number().integer().min(1000).optional(),
    IDENTITY_THROTTLE_LIMIT: Joi.number().integer().min(1).optional(),
    IDENTITY_DATABASE_URL: databaseUrlSchema.required(),
    COMMERCE_DATABASE_URL: databaseUrlSchema.required(),
    OPERATION_DATABASE_URL: databaseUrlSchema.required(),
    REPORTING_SETTING_DATABASE_URL: databaseUrlSchema.optional(),
    REPORTING_DATABASE_URL: databaseUrlSchema.optional(),
    NOTIFICATION_DATABASE_URL: databaseUrlSchema.required(),
    JWT_ACCESS_SECRET: Joi.string().min(16).required(),
    JWT_REFRESH_SECRET: Joi.string().min(16).required(),
    JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
    BCRYPT_SALT_ROUNDS: Joi.number().integer().min(4).max(15).default(10),
    PASSWORD_RESET_EXPIRES_MINUTES: Joi.number().integer().min(5).max(1440).default(30),
    LOG_LEVEL: Joi.string()
      .valid('error', 'warn', 'log', 'debug', 'verbose', 'info')
      .default('info'),
    ENABLE_REQUEST_LOGGING: Joi.boolean()
      .truthy('true')
      .falsy('false')
      .default(true),
    EVENT_RETRY_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
    EVENT_RETRY_STRATEGY: Joi.string().default('delay-buckets'),
    EVENT_RETRY_MAX_ATTEMPTS: Joi.number().integer().min(0).default(4),
    EVENT_RETRY_BACKOFF_MS: Joi.string().default('5000,30000,120000,600000'),
    EVENT_RETRY_JITTER_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
    EVENT_RETRY_JITTER_RATIO: Joi.number().min(0).max(1).default(0.2),
    EVENT_DLQ_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
    EVENT_RETRY_EXCHANGE: Joi.string().default('pharmacy.events.retry'),
    EVENT_DLQ_EXCHANGE: Joi.string().default('pharmacy.events.dlx'),
    EVENT_REPLAY_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
    EVENT_REPLAY_MAX_BATCH_SIZE: Joi.number().integer().min(1).default(50),
    EVENT_FAILURE_RETENTION_DAYS: Joi.number().integer().min(1).default(30),
    EVENT_DLQ_PAYLOAD_PREVIEW_MAX_CHARS: Joi.number().integer().min(200).default(4000),
    EVENT_ADMIN_ENDPOINTS_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  })
    .or('REPORTING_SETTING_DATABASE_URL', 'REPORTING_DATABASE_URL')
    .unknown(true);

  const { error, value } = schema.validate(config, { abortEarly: false });

  if (error) {
    throw new Error(`Environment validation error: ${error.message}`);
  }

  return value;
}
