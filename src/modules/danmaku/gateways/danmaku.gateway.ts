import { 
  WebSocketGateway, 
  WebSocketServer, 
  SubscribeMessage, 
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '@common/guards/ws-jwt.guard';
import { DanmakuService } from '../services/danmaku.service';
import { CreateDanmakuDto } from '../dto/danmaku.dto';
import { Danmaku } from '../entities/danmaku.entity';
import { Video } from '../../content/entities/video.entity';
import { RedisService } from '../../../shared/services/redis.service';

@WebSocketGateway({
  namespace: 'danmaku',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class DanmakuGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private rooms = new Map<string, Set<string>>(); // videoId -> Set<socketId>

  constructor(
    private readonly danmakuService: DanmakuService,
    private readonly redisService: RedisService
  ) {}

  async handleConnection(client: Socket) {
    const videoId = client.handshake.query.videoId as string;
    if (!videoId) {
      client.disconnect();
      return;
    }

    // 加入房间
    client.join(`video:${videoId}`);
    if (!this.rooms.has(videoId)) {
      this.rooms.set(videoId, new Set());
    }
    this.rooms.get(videoId).add(client.id);
  }

  handleDisconnect(client: Socket) {
    const videoId = client.handshake.query.videoId as string;
    if (videoId) {
      client.leave(`video:${videoId}`);
      this.rooms.get(videoId)?.delete(client.id);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('sendDanmaku')
  async handleSendDanmaku(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreateDanmakuDto
  ) {
    // 1. 检查速率限制
    const userId = client.data.user.id;
    if (!(await this.checkRateLimit(userId))) {
      throw new WsException('发送频率过快，请稍后再试');
    }

    // 2. 创建弹幕实体
    const danmaku = new Danmaku();
    Object.assign(danmaku, data);
    danmaku.user = client.data.user;
    danmaku.video = { id: data.videoId } as Video;

    // 3. 保存并广播弹幕
    const savedDanmaku = await this.danmakuService.send(danmaku);

    // 4. 广播给同一视频的其他用户
    this.server
      .to(`video:${data.videoId}`)
      .emit('newDanmaku', savedDanmaku);

    return savedDanmaku;
  }

  // 实时推送弹幕统计更新
  async broadcastDanmakuStats(videoId: string) {
    const stats = await this.danmakuService.getDanmakuStats(videoId);
    this.server
      .to(`video:${videoId}`)
      .emit('danmakuStats', stats);
  }

  // 添加速率限制
  private async checkRateLimit(userId: string): Promise<boolean> {
    const key = `danmaku:rate:${userId}`;
    const count = await this.redisService.incr(key);
    
    if (count === 1) {
      await this.redisService.expire(key, 60); // 1分钟过期
    }

    return count <= 20; // 每分钟最多20条弹幕
  }
} 