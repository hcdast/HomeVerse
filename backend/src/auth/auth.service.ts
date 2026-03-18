import { Injectable, ConflictException, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { FamiliesService } from '../families/families.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private familiesService: FamiliesService,
    private notificationsService: NotificationsService,
    private jwtService: JwtService,
  ) {}

  // 用户注册
  async register(registerDto: RegisterDto) {
    const { username, email, password, inviteToken } = registerDto;

    // 检查邮箱是否已存在
    const existingUserByEmail = await this.usersService.findByEmail(email);
    if (existingUserByEmail) {
      throw new ConflictException('该邮箱已被注册');
    }

    // 检查用户名是否已存在
    const existingUserByUsername = await this.usersService.findByUsername(username);
    if (existingUserByUsername) {
      throw new ConflictException('该用户名已被使用');
    }

    // 解析邀请信息
    let inviteInfo: any = null;
    if (inviteToken) {
      try {
        inviteInfo = JSON.parse(Buffer.from(inviteToken, 'base64').toString());
        
        // 验证邀请信息的邮箱是否匹配
        if (inviteInfo.email && inviteInfo.email !== email) {
          throw new ConflictException(`请使用受邀邮箱注册: ${inviteInfo.email}`);
        }

        // 验证邀请是否过期（7天有效期）
        const inviteAge = Date.now() - inviteInfo.timestamp;
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
        if (inviteAge > maxAge) {
          throw new ConflictException('邀请链接已过期，请重新获取邀请');
        }
      } catch (error) {
        if (error instanceof ConflictException) throw error;
        throw new ConflictException('邀请链接无效');
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 根据是否有邀请决定用户角色和家庭
    let user;
    let familyId: string;

    if (inviteInfo) {
      // 通过邀请注册 - 加入指定家庭
      user = await this.usersService.create({
        username,
        email,
        password: hashedPassword,
        role: inviteInfo.role || 'member',
        familyId: inviteInfo.familyId,
      });

      // 将用户添加到家庭成员列表
      await this.familiesService.addMember(inviteInfo.familyId, user._id.toString());

      familyId = inviteInfo.familyId;

      this.logger.log(`用户 ${username} 通过邀请注册，自动加入家庭 ${inviteInfo.familyId}`);
      
      // 发送站内通知
      try {
        // 获取家庭信息
        const familyData = await this.familiesService.findById(inviteInfo.familyId);
        const familyName = familyData?.name || inviteInfo.familyName || '家庭';

        // 通知新成员
        await this.notificationsService.create({
          recipient: user._id.toString(),
          familyId: inviteInfo.familyId,
          type: NotificationType.MEMBER_INVITED,
          title: '欢迎加入',
          content: `欢迎加入 ${familyName}！`,
          link: '/family-members',
        });

        // 通知其他家庭成员
        const otherMembers = await this.usersService.findFamilyMembers(inviteInfo.familyId);
        const memberIds = otherMembers
          .filter(m => m._id.toString() !== user._id.toString())
          .map(m => m._id.toString());
        
        if (memberIds.length > 0) {
          await this.notificationsService.notifyMemberJoined(
            memberIds,
            inviteInfo.familyId,
            username,
          );
        }

        this.logger.log(`已发送注册成功通知给 ${username} 和其他家庭成员`);
      } catch (error) {
        this.logger.error(`发送通知失败: ${error.message}`);
      }
    } else {
      // 自主注册 - 创建新家庭（当前暂不支持，但保留代码）
      user = await this.usersService.create({
        username,
        email,
        password: hashedPassword,
        role: 'owner',
      });

      // 创建默认家庭
      const family = await this.familiesService.create({
        name: `${username}的家庭`,
        createdBy: user._id.toString(),
        members: [user._id.toString()],
      });

      // 更新用户的家庭ID
      await this.usersService.updateFamilyId(user._id.toString(), family._id.toString());
      familyId = family._id.toString();
    }

    // 生成JWT token
    const payload = { 
      email: user.email, 
      sub: user._id,
      role: user.role,
      familyId: familyId,
      username: user.username,  // 添加用户名用于聊天显示
      avatar: user.avatar,      // 添加头像用于聊天显示
    };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        _id: user._id,
        id: user._id,
        userId: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        familyId: familyId,
        permissions: user.permissions || {},
      },
      message: inviteInfo ? '注册成功，已加入家庭' : '注册成功',
    };
  }

  // 验证用户登录（支持邮箱或用户名）
  async validateUser(identifier: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmailOrUsername(identifier);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  // 用户登录
  async login(user: any) {
    const payload = { 
      email: user.email, 
      sub: user._id,
      role: user.role,
      familyId: user.familyId,
      username: user.username,  // 添加用户名用于聊天显示
      avatar: user.avatar,      // 添加头像用于聊天显示
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        _id: user._id,
        id: user._id,
        userId: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        familyId: user.familyId,
        permissions: user.permissions || {},
      },
    };
  }
}

