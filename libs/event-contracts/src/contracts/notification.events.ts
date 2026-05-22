export interface NotificationEventCreatedPayload {
  notificationEventId: string;
  type: string;
  severity: string;
  channel: string;
  recipientUserId?: string | null;
  branchId?: string | null;
  warehouseId?: string | null;
  sourceService: string;
  sourceModule?: string | null;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  createdAt: string;
}
