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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/message.dto';
import { UsersService } from '../users/users.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
  userAvatar?: string;
  familyId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private typingUsers: Map<string, Set<string>> = new Map(); // familyId -> Set<userId>

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private chatService: ChatService,
    private usersService: UsersService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`聊天连接失败：未提供 token - ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      client.userId = payload.sub;
      client.familyId = payload.familyId;

      // 如果 JWT 中没有用户名或头像，从数据库查询
      if (payload.username) {
        client.userName = payload.username;
        client.userAvatar = payload.avatar;
      } else {
        // 兼容旧 token，从数据库查询用户信息
        try {
          const user = await this.usersService.findById(payload.sub);
          if (user) {
            client.userName = user.username;
            client.userAvatar = user.avatar;
          }
        } catch (err) {
          this.logger.warn(`获取用户信息失败: ${err.message}`);
        }
      }

      // 确保有用户名
      if (!client.userName) {
        client.userName = '用户';
      }

      if (client.familyId) {
        client.join(`chat:${client.familyId}`);
        
        // 通知其他成员有人上线
        client.to(`chat:${client.familyId}`).emit('user:online', {
          userId: client.userId,
          userName: client.userName,
        });
      }

      this.logger.log(`用户加入聊天: ${client.userName} (${client.userId})`);

      client.emit('chat:connected', {
        message: '聊天已连接',
        userId: client.userId,
        familyId: client.familyId,
      });

    } catch (error) {
      this.logger.error(`聊天认证失败: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.familyId) {
      // 清除正在输入状态
      const typingSet = this.typingUsers.get(client.familyId);
      if (typingSet && client.userId) {
        typingSet.delete(client.userId);
      }

      // 通知其他成员有人离线
      client.to(`chat:${client.familyId}`).emit('user:offline', {
        userId: client.userId,
        userName: client.userName,
      });
    }

    this.logger.log(`用户离开聊天: ${client.userName || 'unknown'}`);
  }

  // 发送消息
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageDto,
  ) {
    if (!client.familyId || !client.userId) {
      return { success: false, error: '未认证' };
    }

    try {
      const message = await this.chatService.sendMessage(
        client.familyId,
        client.userId,
        client.userName || '未知用户',
        client.userAvatar,
        data,
      );

      // 广播消息给家庭所有成员
      this.server.to(`chat:${client.familyId}`).emit('message:new', message);

      // 清除发送者的输入状态
      this.clearTyping(client.familyId, client.userId);

      return { success: true, message };
    } catch (error) {
      this.logger.error(`发送消息失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // 正在输入
  @SubscribeMessage('typing:start')
  handleTypingStart(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.familyId || !client.userId) return;

    if (!this.typingUsers.has(client.familyId)) {
      this.typingUsers.set(client.familyId, new Set());
    }
    this.typingUsers.get(client.familyId)!.add(client.userId);

    client.to(`chat:${client.familyId}`).emit('typing:update', {
      userId: client.userId,
      userName: client.userName,
      isTyping: true,
    });
  }

  // 停止输入
  @SubscribeMessage('typing:stop')
  handleTypingStop(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.familyId || !client.userId) return;
    this.clearTyping(client.familyId, client.userId);

    client.to(`chat:${client.familyId}`).emit('typing:update', {
      userId: client.userId,
      userName: client.userName,
      isTyping: false,
    });
  }

  // 标记已读
  @SubscribeMessage('message:read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() messageIds: string[],
  ) {
    if (!client.familyId || !client.userId) return;

    await this.chatService.markAsRead(client.familyId, client.userId, messageIds);

    // 通知其他成员消息已读状态更新
    client.to(`chat:${client.familyId}`).emit('message:read_update', {
      userId: client.userId,
      messageIds,
    });
  }

  // 删除消息
  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() messageId: string,
  ) {
    if (!client.familyId || !client.userId) {
      return { success: false, error: '未认证' };
    }

    try {
      await this.chatService.deleteMessage(messageId, client.userId, client.familyId);

      // 通知所有成员消息已删除
      this.server.to(`chat:${client.familyId}`).emit('message:deleted', {
        messageId,
        deletedBy: client.userId,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 获取在线成员
  @SubscribeMessage('members:online')
  async handleGetOnlineMembers(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.familyId) return { members: [] };

    const roomName = `chat:${client.familyId}`;
    const sockets = await this.server.in(roomName).fetchSockets();
    
    const onlineMembers: Array<{ oderId: string; userName: string }> = [];
    
    for (const socket of sockets) {
      const authSocket = socket as unknown as AuthenticatedSocket;
      if (authSocket?.userId && authSocket?.userName) {
        onlineMembers.push({
          oderId: authSocket.userId,
          userName: authSocket.userName,
        });
      }
    }

    return { members: onlineMembers };
  }

  private clearTyping(familyId: string, oderId: string) {
    const typingSet = this.typingUsers.get(familyId);
    if (typingSet) {
      typingSet.delete(oderId);
    }
  }
}



