export const LOGGER_CONTEXT = 'AppLogger';

export const SENSITIVE_KEYS = [
  'password',
  'passwordHash',
  'newPassword',
  'oldPassword',
  'token',
  'tokenHash',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'set-cookie',
  'secret',
  'jwt_access_secret',
  'jwt_refresh_secret',
  'database_url',
  'smtp_password',
  'payment_gateway_secret',
  'apiKey',
] as const;

export const REDACTED_VALUE = '[REDACTED]';
