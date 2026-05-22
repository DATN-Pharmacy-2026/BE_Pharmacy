import {
  NotificationChannel,
  NotificationEventStatus,
  NotificationEventType,
  NotificationSeverity,
} from '.prisma/client/reporting';

export const NOTIFICATION_EVENT_TYPES = Object.values(NotificationEventType);
export const NOTIFICATION_CHANNELS = Object.values(NotificationChannel);
export const NOTIFICATION_SEVERITIES = Object.values(NotificationSeverity);
export const NOTIFICATION_STATUSES = Object.values(NotificationEventStatus);
