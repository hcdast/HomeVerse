import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Family, FamilyDocument } from './schemas/family.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { UserRole } from '../common/enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class FamiliesService {
  private readonly logger = new Logger(FamiliesService.name);

  constructor(
    @InjectModel(Family.name) private familyModel: Model<FamilyDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private notificationsService: NotificationsService,
    private mailService: MailService,
  ) {}

  // 创建家庭
  async create(createFamilyDto: any): Promise<FamilyDocument> {
    const createdFamily = new this.familyModel(createFamilyDto);
    return createdFamily.save();
  }

  // 根据ID查找家庭
  async findById(id: string): Promise<FamilyDocument | null> {
    return this.familyModel.findById(id).exec();
  }

  // 添加家庭成员
  async addMember(familyId: string, userId: string): Promise<FamilyDocument> {
    const family = await this.familyModel.findById(familyId);
    if (!family) {
      throw new NotFoundException('家庭不存在');
    }
    if (!family.members.includes(userId)) {
      family.members.push(userId);
      return family.save();
    }
    return family;
  }

  // 移除家庭成员
  async removeMember(familyId: string, userId: string): Promise<FamilyDocument> {
    const family = await this.familyModel.findById(familyId);
    if (!family) {
      throw new NotFoundException('家庭不存在');
    }
    family.members = family.members.filter(id => id.toString() !== userId);
    return family.save();
  }

  // 更新家庭信息
  async update(id: string, updateFamilyDto: any): Promise<FamilyDocument> {
    return this.familyModel.findByIdAndUpdate(id, updateFamilyDto, { new: true }).exec();
  }

  // 获取家庭所有成员（包含用户信息）
  async getMembers(familyId: string): Promise<any[]> {
    const family = await this.familyModel.findById(familyId);
    if (!family) {
      throw new NotFoundException('家庭不存在');
    }

    const members = await this.userModel
      .find({ familyId })
      .select('-password')
      .lean()
      .exec();

    return members;
  }

  // 邀请成员（通过邮箱）
  async inviteMember(
    familyId: string,
    email: string,
    role: UserRole = UserRole.MEMBER,
  ): Promise<{ message: string; inviteToken?: string; inviteLink?: string; user?: any }> {
    // 验证输入
    if (!email || !email.includes('@')) {
      throw new BadRequestException('邮箱格式不正确');
    }

    const family = await this.familyModel.findById(familyId);
    if (!family) {
      throw new NotFoundException('家庭不存在');
    }

    // 检查家庭成员数量限制（可选）
    const currentMemberCount = await this.userModel.countDocuments({ familyId });
    if (currentMemberCount >= 50) {
      throw new BadRequestException('家庭成员已达上限（50人）');
    }

    // 检查用户是否已存在
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      // 用户已是当前家庭成员
      if (existingUser.familyId === familyId) {
        throw new BadRequestException('该用户已是家庭成员');
      }
      
      // 用户已加入其他家庭
      if (existingUser.familyId) {
        throw new BadRequestException('该用户已加入其他家庭，一个用户只能加入一个家庭');
      }

      // 用户存在但未加入家庭，直接添加
      existingUser.familyId = familyId;
      existingUser.role = role;
      
      // 设置默认权限
      if (!existingUser.permissions || Object.keys(existingUser.permissions).length === 0) {
        existingUser.permissions = this.getDefaultPermissions(role);
      }
      
      await existingUser.save();

      // 添加到家庭成员列表
      if (!family.members.includes(existingUser._id.toString())) {
        await this.addMember(familyId, existingUser._id.toString());
      }

      this.logger.log(`用户 ${email} 已加入家庭 ${familyId}，角色: ${role}`);
      
      // 发送站内通知
      try {
        await this.notificationsService.notifyMemberInvited(
          existingUser._id.toString(),
          familyId,
          family.name || '家庭',
        );
        
        // 通知其他家庭成员有新成员加入
        const otherMembers = await this.userModel
          .find({ 
            familyId, 
            _id: { $ne: existingUser._id } 
          })
          .select('_id')
          .exec();
        
        if (otherMembers.length > 0) {
          const memberIds = otherMembers.map(m => m._id.toString());
          await this.notificationsService.notifyMemberJoined(
            memberIds,
            familyId,
            existingUser.username,
          );
        }
        
        this.logger.log(`已发送站内通知给用户 ${email}`);
      } catch (error) {
        this.logger.error(`发送站内通知失败: ${error.message}`);
      }
      
      // 发送邮件通知
      try {
        // 获取邀请人信息
        const inviter = await this.userModel.findOne({ familyId, role: { $in: [UserRole.OWNER, UserRole.ADMIN] } });
        const inviterName = inviter ? inviter.username : '家庭管理员';
        
        await this.mailService.sendMemberInvitation(
          email,
          family.name || '家庭',
          inviterName,
          role,
        );
        this.logger.log(`已发送邀请邮件到 ${email}`);
      } catch (error) {
        this.logger.error(`发送邮件失败: ${error.message}`);
        // 不影响主流程
      }
      
      // 返回用户信息（不含密码）
      const { password, ...userWithoutPassword } = existingUser.toObject();
      
      return { 
        message: '邀请成功，用户已加入家庭',
        user: userWithoutPassword,
      };
    }

    // 用户不存在，生成邀请链接
    const inviteToken = Buffer.from(
      JSON.stringify({
        familyId,
        familyName: family.name || '家庭',
        email,
        role,
        timestamp: Date.now(),
      })
    ).toString('base64');
    
    this.logger.log(`生成邀请令牌，邀请 ${email} 加入家庭 ${familyId}，角色: ${role}`);
    
    // 生成注册链接（带邀请token）
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = `${frontendUrl}/register?invite=${inviteToken}`;
    
    // 发送邀请邮件（给未注册用户）
    try {
      // 获取邀请人信息
      const inviter = await this.userModel.findOne({ familyId, role: { $in: [UserRole.OWNER, UserRole.ADMIN] } });
      const inviterName = inviter ? inviter.username : '家庭管理员';
      
      await this.mailService.sendMemberInvitation(
        email,
        family.name || '家庭',
        inviterName,
        role,
        inviteLink,
      );
      this.logger.log(`已发送邀请邮件到 ${email}，邀请链接: ${inviteLink}`);
    } catch (error) {
      this.logger.error(`发送邮件失败: ${error.message}`);
    }
    
    return {
      message: '已发送邀请邮件到对方邮箱，对方点击邮件中的链接即可注册并自动加入家庭',
      inviteToken,
      inviteLink, // 返回邀请链接，可供复制分享
    };
  }

  // 获取角色的默认权限
  private getDefaultPermissions(role: UserRole): any {
    const defaultPermissions = {
      [UserRole.OWNER]: {
        albums: { read: true, write: true, delete: true },
        files: { read: true, write: true, delete: true },
        articles: { read: true, write: true, delete: true },
        members: { read: true, write: true, delete: true },
      },
      [UserRole.ADMIN]: {
        albums: { read: true, write: true, delete: true },
        files: { read: true, write: true, delete: true },
        articles: { read: true, write: true, delete: true },
        members: { read: true, write: true, delete: false },
      },
      [UserRole.EDITOR]: {
        albums: { read: true, write: true, delete: false },
        files: { read: true, write: true, delete: false },
        articles: { read: true, write: true, delete: false },
        members: { read: true, write: false, delete: false },
      },
      [UserRole.VIEWER]: {
        albums: { read: true, write: false, delete: false },
        files: { read: true, write: false, delete: false },
        articles: { read: true, write: false, delete: false },
        members: { read: true, write: false, delete: false },
      },
      [UserRole.MEMBER]: {
        albums: { read: true, write: true, delete: false },
        files: { read: true, write: true, delete: false },
        articles: { read: true, write: false, delete: false },
        members: { read: true, write: false, delete: false },
      },
    };

    return defaultPermissions[role] || {};
  }

  // 更新成员角色
  async updateMemberRole(
    familyId: string,
    userId: string,
    newRole: UserRole,
    operatorRole: UserRole,
  ): Promise<any> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (user.familyId !== familyId) {
      throw new BadRequestException('用户不属于该家庭');
    }

    // 不能修改所有者角色
    if (user.role === UserRole.OWNER) {
      throw new BadRequestException('不能修改所有者的角色。如需变更，请使用转让所有权功能');
    }

    // 不能设置为所有者角色
    if (newRole === UserRole.OWNER) {
      throw new BadRequestException('不能直接设置为所有者角色。请使用转让所有权功能');
    }

    // 管理员不能设置其他管理员角色
    if (operatorRole === UserRole.ADMIN && (user.role === UserRole.ADMIN || newRole === UserRole.ADMIN)) {
      throw new BadRequestException('管理员不能修改其他管理员的角色');
    }

    const oldRole = user.role;
    user.role = newRole;
    
    // 角色变更时，重置为默认权限
    user.permissions = this.getDefaultPermissions(newRole);
    
    await user.save();

    this.logger.log(`用户 ${user.username}(${userId}) 角色已从 ${oldRole} 更新为 ${newRole}`);
    
    // 发送角色变更通知
    try {
      const operator = await this.userModel.findOne({ familyId, role: operatorRole });
      if (operator) {
        await this.notificationsService.notifyRoleChanged(
          userId,
          familyId,
          newRole,
          operator.username,
        );
        this.logger.log(`已发送角色变更通知给用户 ${user.username}`);
      }
    } catch (error) {
      this.logger.error(`发送角色变更通知失败: ${error.message}`);
    }
    
    // 返回不含密码的用户信息
    const { password, ...userWithoutPassword } = user.toObject();
    
    return userWithoutPassword;
  }

  // 更新成员自定义权限
  async updateMemberPermissions(
    familyId: string,
    userId: string,
    permissions: any,
    operatorRole: UserRole,
  ): Promise<any> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (user.familyId !== familyId) {
      throw new BadRequestException('用户不属于该家庭');
    }

    // 不能修改所有者的权限
    if (user.role === UserRole.OWNER) {
      throw new BadRequestException('不能修改所有者的权限');
    }

    // 只有所有者和管理员可以设置权限
    if (![UserRole.OWNER, UserRole.ADMIN].includes(operatorRole)) {
      throw new BadRequestException('您没有权限设置成员权限');
    }

    // 验证权限格式
    const validResources = ['albums', 'files', 'articles', 'members'];
    const validActions = ['read', 'write', 'delete'];

    for (const resource in permissions) {
      if (!validResources.includes(resource)) {
        throw new BadRequestException(`无效的资源类型: ${resource}`);
      }
      
      for (const action in permissions[resource]) {
        if (!validActions.includes(action)) {
          throw new BadRequestException(`无效的操作类型: ${action}`);
        }
        
        if (typeof permissions[resource][action] !== 'boolean') {
          throw new BadRequestException(`权限值必须是布尔类型`);
        }
      }
    }

    // 合并权限
    user.permissions = { ...user.permissions, ...permissions };
    await user.save();

    this.logger.log(`用户 ${user.username}(${userId}) 自定义权限已更新`);
    
    // 发送权限变更通知
    try {
      const operator = await this.userModel.findOne({ familyId, role: operatorRole });
      if (operator) {
        await this.notificationsService.notifyPermissionChanged(
          userId,
          familyId,
          operator.username,
        );
        this.logger.log(`已发送权限变更通知给用户 ${user.username}`);
      }
    } catch (error) {
      this.logger.error(`发送权限变更通知失败: ${error.message}`);
    }
    
    // 返回不含密码的用户信息
    const { password, ...userWithoutPassword } = user.toObject();
    
    return userWithoutPassword;
  }

  // 移除成员（增强版）
  async removeMemberEnhanced(
    familyId: string,
    userId: string,
    operatorId: string,
    operatorRole: UserRole,
  ): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 不能移除自己
    if (userId === operatorId) {
      throw new BadRequestException('不能移除自己，如需离开家庭请联系管理员');
    }

    if (user.familyId !== familyId) {
      throw new BadRequestException('用户不属于该家庭');
    }

    // 不能移除所有者
    if (user.role === UserRole.OWNER) {
      throw new BadRequestException('不能移除家庭所有者。如需移除，请先转让所有权');
    }

    // 权限检查：只有所有者和管理员可以移除成员
    if (![UserRole.OWNER, UserRole.ADMIN].includes(operatorRole)) {
      throw new BadRequestException('您没有权限移除成员。需要管理员或所有者权限');
    }

    // 管理员不能移除其他管理员，只有所有者可以
    if (operatorRole === UserRole.ADMIN && user.role === UserRole.ADMIN) {
      throw new BadRequestException('管理员不能移除其他管理员，请联系所有者');
    }

    // 清除用户的家庭关联
    user.familyId = null;
    user.role = UserRole.MEMBER; // 重置为普通成员
    user.permissions = {}; // 清空自定义权限
    await user.save();

    // 从家庭成员列表中移除
    await this.removeMember(familyId, userId);

    this.logger.log(`用户 ${user.username}(${userId}) 已从家庭 ${familyId} 移除，操作者: ${operatorId}`);
    
    return { 
      message: `成员 ${user.username} 已成功移除`,
    };
  }

  // 转让所有者权限
  async transferOwnership(
    familyId: string,
    currentOwnerId: string,
    newOwnerId: string,
  ): Promise<{ message: string; currentOwner: any; newOwner: any }> {
    // 不能转让给自己
    if (currentOwnerId === newOwnerId) {
      throw new BadRequestException('不能将所有权转让给自己');
    }

    const currentOwner = await this.userModel.findById(currentOwnerId);
    const newOwner = await this.userModel.findById(newOwnerId);

    if (!currentOwner || !newOwner) {
      throw new NotFoundException('用户不存在');
    }

    if (currentOwner.familyId !== familyId || newOwner.familyId !== familyId) {
      throw new BadRequestException('用户不属于该家庭');
    }

    if (currentOwner.role !== UserRole.OWNER) {
      throw new BadRequestException('只有所有者可以转让所有权');
    }

    // 确认新所有者不是当前所有者
    if (newOwner.role === UserRole.OWNER) {
      throw new BadRequestException('该用户已经是所有者');
    }

    // 转让权限
    const oldOwnerName = currentOwner.username;
    const newOwnerName = newOwner.username;

    currentOwner.role = UserRole.ADMIN;
    currentOwner.permissions = this.getDefaultPermissions(UserRole.ADMIN);
    
    newOwner.role = UserRole.OWNER;
    newOwner.permissions = this.getDefaultPermissions(UserRole.OWNER);

    await currentOwner.save();
    await newOwner.save();

    // 更新家庭创建者信息（可选）
    await this.familyModel.findByIdAndUpdate(familyId, {
      createdBy: newOwnerId,
    });

    this.logger.log(
      `家庭 ${familyId} 所有权已从 ${oldOwnerName}(${currentOwnerId}) 转让给 ${newOwnerName}(${newOwnerId})`
    );
    
    return { 
      message: `所有权已成功转让给 ${newOwnerName}`,
      currentOwner: {
        id: currentOwnerId,
        username: oldOwnerName,
        newRole: UserRole.ADMIN,
      },
      newOwner: {
        id: newOwnerId,
        username: newOwnerName,
        newRole: UserRole.OWNER,
      },
    };
  }
}

