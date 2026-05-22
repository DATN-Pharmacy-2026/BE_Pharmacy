import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from '.prisma/client/reporting';

export const DEFAULT_NOTIFICATION_WS_NAMESPACE =
  process.env.NOTIFICATION_WS_NAMESPACE ?? '/notifications';

export const EMAIL_PROVIDER_CONSOLE = 'console';
export const EMAIL_PROVIDER_SMTP = 'smtp';

export const ALLOWED_DELIVERY_CHANNELS = Object.values(NotificationChannel);
export const ALLOWED_DELIVERY_STATUSES = Object.values(
  NotificationDeliveryStatus,
);
