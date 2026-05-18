import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: process.env.NOTIFICATION_WS_NAMESPACE ?? '/notifications',
  cors: {
    origin: process.env.NOTIFICATION_WS_CORS_ORIGIN ?? '*',
  },
})
export class NotificationWebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  handleConnection(@ConnectedSocket() client: Socket) {
    const userId = this.extractString(client, 'userId');
    const branchId = this.extractString(client, 'branchId');
    const warehouseId = this.extractString(client, 'warehouseId');

    if (userId) client.join(`user:${userId}`);
    if (branchId) client.join(`branch:${branchId}`);
    if (warehouseId) client.join(`warehouse:${warehouseId}`);
  }

  handleDisconnect(@ConnectedSocket() _client: Socket) {
    return;
  }

  private extractString(client: Socket, key: string): string | undefined {
    const queryValue = client.handshake.query?.[key];
    if (typeof queryValue === 'string' && queryValue.trim().length > 0) {
      return queryValue;
    }
    const authValue = (client.handshake.auth as Record<string, unknown>)?.[key];
    if (typeof authValue === 'string' && authValue.trim().length > 0) {
      return authValue;
    }
    const headerValue = client.handshake.headers?.[key.toLowerCase()];
    if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
      return headerValue;
    }
    return undefined;
  }
}
