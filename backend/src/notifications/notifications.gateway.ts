import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  familyId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set<socketId>
  private familySockets: Map<string, Set<string>> = new Map(); // familyId -> Set<socketId>

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token || 
                    client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn(`客户端连接失败：未提供 token - ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      client.userId = payload.sub;
      client.familyId = payload.familyId;

      // 添加到用户 socket 映射
      if (!this.userSockets.has(client.userId)) {
        this.userSockets.set(client.userId, new Set());
      }
      this.userSockets.get(client.userId)!.add(client.id);

      // 加入用户专属房间
      client.join(`user:${client.userId}`);

      // 如果有家庭，加入家庭房间
      if (client.familyId) {
        if (!this.familySockets.has(client.familyId)) {
          this.familySockets.set(client.familyId, new Set());
        }
        this.familySockets.get(client.familyId)!.add(client.id);
        client.join(`family:${client.familyId}`);
      }

      this.logger.log(`用户已连接: ${client.userId} (socket: ${client.id})`);

      // 发送连接成功消息
      client.emit('connected', {
        message: '连接成功',
        userId: client.userId,
        familyId: client.familyId,
      });

    } catch (error) {
      this.logger.error(`认证失败: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSocketSet = this.userSockets.get(client.userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }
    }

    if (client.familyId) {
      const familySocketSet = this.familySockets.get(client.familyId);
      if (familySocketSet) {
        familySocketSet.delete(client.id);
        if (familySocketSet.size === 0) {
          this.familySockets.delete(client.familyId);
        }
      }
    }

    this.logger.log(`用户已断开: ${client.userId || 'unknown'} (socket: ${client.id})`);
  }

  // 发送通知给特定用户
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
    this.logger.debug(`发送通知给用户 ${userId}: ${event}`);
  }

  // 发送通知给家庭所有成员
  sendToFamily(familyId: string, event: string, data: any) {
    this.server.to(`family:${familyId}`).emit(event, data);
    this.logger.debug(`发送通知给家庭 ${familyId}: ${event}`);
  }

  // 广播给所有连接的用户
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.debug(`广播通知: ${event}`);
  }

  // 获取在线用户数量
  getOnlineUsersCount(): number {
    return this.userSockets.size;
  }

  // 检查用户是否在线
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  // 客户端订阅的消息处理
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket): string {
    return 'pong';
  }

  @SubscribeMessage('subscribe_family')
  handleSubscribeFamily(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() familyId: string,
  ) {
    if (client.familyId === familyId) {
      client.join(`family:${familyId}`);
      return { success: true, message: '已订阅家庭通知' };
    }
    return { success: false, message: '无权订阅此家庭' };
  }

  // ============= 业务通知方法 =============

  // 新通知推送
  notifyNewNotification(userId: string, notification: any) {
    this.sendToUser(userId, 'notification:new', notification);
  }

  // 待办任务提醒
  notifyTodoReminder(userId: string, todo: any) {
    this.sendToUser(userId, 'todo:reminder', todo);
  }

  // 日历事件提醒
  notifyCalendarEvent(userId: string, event: any) {
    this.sendToUser(userId, 'calendar:reminder', event);
  }

  // 家庭动态更新
  notifyFamilyMoment(familyId: string, moment: any) {
    this.sendToFamily(familyId, 'moment:new', moment);
  }

  // 财务变动通知
  notifyFinanceUpdate(familyId: string, finance: any) {
    this.sendToFamily(familyId, 'finance:update', finance);
  }

  // 成员状态变化
  notifyMemberStatusChange(familyId: string, member: any) {
    this.sendToFamily(familyId, 'member:status', member);
  }
}



