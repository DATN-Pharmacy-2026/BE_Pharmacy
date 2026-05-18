import { Injectable } from '@nestjs/common';
import { NotificationEvent } from '.prisma/client/reporting';
import { NotificationWebsocketGateway } from './notification-websocket.gateway';

@Injectable()
export class NotificationWebsocketService {
  constructor(private readonly gateway: NotificationWebsocketGateway) {}

  emitToRecipient(userId: string, payload: unknown) {
    this.gateway.server?.to(`user:${userId}`).emit('notification.event', payload);
  }

  emitToBranch(branchId: string, payload: unknown) {
    this.gateway.server?.to(`branch:${branchId}`).emit('notification.event', payload);
  }

  emitToWarehouse(warehouseId: string, payload: unknown) {
    this.gateway.server
      ?.to(`warehouse:${warehouseId}`)
      .emit('notification.event', payload);
  }

  broadcast(payload: unknown) {
    this.gateway.server?.emit('notification.event', payload);
  }

  emitNotificationEvent(event: NotificationEvent) {
    if (event.recipientUserId) {
      this.emitToRecipient(event.recipientUserId, event);
      return;
    }
    if (event.branchId) {
      this.emitToBranch(event.branchId, event);
      return;
    }
    if (event.warehouseId) {
      this.emitToWarehouse(event.warehouseId, event);
    }
  }

  emitDelivered(event: NotificationEvent) {
    this.gateway.server?.emit('notification.delivered', event);
  }

  emitRead(event: NotificationEvent) {
    this.gateway.server?.emit('notification.read', event);
  }
}
