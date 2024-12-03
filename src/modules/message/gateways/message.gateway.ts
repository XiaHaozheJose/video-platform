import { 
  WebSocketGateway, 
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '@common/guards/ws-jwt.guard';
import { MessageService } from '../services/message.service';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  namespace: 'messages',
  cors: true
})
@UseGuards(WsJwtGuard)
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Set<string>>();  // userId -> Set<socketId>

  constructor(private messageService: MessageService) {}

  handleConnection(client: Socket) {
    const userId = client.data.user.id;
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(client.id);

    // 发送未读消息数
    this.sendUnreadCount(userId);
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.user.id;
    this.userSockets.get(userId)?.delete(client.id);
  }

  // 监听消息创建事件
  @OnEvent('message.created')
  async handleMessageCreated(message: any) {
    const userId = message.receiver.id;
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      // 向用户的所有连接发送新消息通知
      sockets.forEach(socketId => {
        this.server.to(socketId).emit('newMessage', message);
      });
    }
  }

  // 发送未读消息数
  private async sendUnreadCount(userId: string) {
    const unreadCount = await this.messageService.getUnreadCount(userId);
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach(socketId => {
        this.server.to(socketId).emit('unreadCount', unreadCount);
      });
    }
  }
} 