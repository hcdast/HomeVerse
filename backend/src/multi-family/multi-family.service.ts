import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  FamilyMembership,
  FamilyMembershipDocument,
  MemberRole,
  MembershipStatus,
} from './schemas/family-membership.schema';
import { Family, FamilyDocument } from '../families/schemas/family.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class MultiFamilyService {
  private readonly logger = new Logger(MultiFamilyService.name);

  constructor(
    @InjectModel(FamilyMembership.name) private membershipModel: Model<FamilyMembershipDocument>,
    @InjectModel(Family.name) private familyModel: Model<FamilyDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // ============= 家庭创建与管理 =============

  // 创建新家庭
  async createFamily(
    userId: string,
    data: { name: string; description?: string },
  ): Promise<{ family: FamilyDocument; membership: FamilyMembershipDocument }> {
    const userObjId = new Types.ObjectId(userId);

    // 创建家庭
    const family = new this.familyModel({
      name: data.name,
      description: data.description,
      createdBy: userObjId,
      members: [userObjId],
    });
    await family.save();

    // 创建成员关系（创建者为owner）
    const membership = new this.membershipModel({
      userId: userObjId,
      familyId: family._id,
      role: MemberRole.OWNER,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date(),
      isDefault: await this.isFirstFamily(userId),
    });
    await membership.save();

    // 更新用户的默认家庭
    if (membership.isDefault) {
      await this.userModel.findByIdAndUpdate(userId, { familyId: family._id.toString() });
    }

    return { family, membership };
  }

  // 检查是否为用户的第一个家庭
  private async isFirstFamily(userId: string): Promise<boolean> {
    const count = await this.membershipModel.countDocuments({
      userId: new Types.ObjectId(userId),
      status: MembershipStatus.ACTIVE,
    });
    return count === 0;
  }

  // ============= 成员邀请与加入 =============

  // 邀请用户加入家庭
  async inviteMember(
    familyId: string,
    inviterId: string,
    data: { email?: string; userId?: string; role?: MemberRole; relationship?: string },
  ): Promise<FamilyMembershipDocument> {
    // 检查邀请者权限
    const inviterMembership = await this.getMembership(familyId, inviterId);
    if (!inviterMembership || !this.canInvite(inviterMembership.role)) {
      throw new ForbiddenException('无权邀请成员');
    }

    // 查找被邀请用户
    let targetUser: UserDocument | null = null;
    if (data.userId) {
      targetUser = await this.userModel.findById(data.userId);
    } else if (data.email) {
      targetUser = await this.userModel.findOne({ email: data.email });
    }

    if (!targetUser) {
      throw new NotFoundException('用户不存在');
    }

    // 检查是否已是成员
    const existingMembership = await this.membershipModel.findOne({
      userId: targetUser._id,
      familyId: new Types.ObjectId(familyId),
    });

    if (existingMembership) {
      if (existingMembership.status === MembershipStatus.ACTIVE) {
        throw new BadRequestException('用户已是家庭成员');
      }
      // 重新激活
      existingMembership.status = MembershipStatus.PENDING;
      existingMembership.invitedBy = new Types.ObjectId(inviterId);
      return existingMembership.save();
    }

    // 创建待确认的成员关系
    const membership = new this.membershipModel({
      userId: targetUser._id,
      familyId: new Types.ObjectId(familyId),
      role: data.role || MemberRole.MEMBER,
      status: MembershipStatus.PENDING,
      relationship: data.relationship,
      invitedBy: new Types.ObjectId(inviterId),
    });

    return membership.save();
  }

  // 接受邀请
  async acceptInvitation(userId: string, familyId: string): Promise<FamilyMembershipDocument> {
    const membership = await this.membershipModel.findOne({
      userId: new Types.ObjectId(userId),
      familyId: new Types.ObjectId(familyId),
      status: MembershipStatus.PENDING,
    });

    if (!membership) {
      throw new NotFoundException('邀请不存在或已过期');
    }

    membership.status = MembershipStatus.ACTIVE;
    membership.joinedAt = new Date();
    membership.isDefault = await this.isFirstFamily(userId);
    await membership.save();

    // 添加到家庭成员列表
    await this.familyModel.findByIdAndUpdate(familyId, {
      $addToSet: { members: new Types.ObjectId(userId) },
    });

    // 如果是第一个家庭，设为默认
    if (membership.isDefault) {
      await this.userModel.findByIdAndUpdate(userId, { familyId });
    }

    return membership;
  }

  // 拒绝邀请
  async rejectInvitation(userId: string, familyId: string): Promise<void> {
    const result = await this.membershipModel.deleteOne({
      userId: new Types.ObjectId(userId),
      familyId: new Types.ObjectId(familyId),
      status: MembershipStatus.PENDING,
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('邀请不存在');
    }
  }

  // ============= 家庭切换 =============

  // 切换当前家庭
  async switchFamily(userId: string, familyId: string): Promise<FamilyMembershipDocument> {
    const membership = await this.membershipModel.findOne({
      userId: new Types.ObjectId(userId),
      familyId: new Types.ObjectId(familyId),
      status: MembershipStatus.ACTIVE,
    });

    if (!membership) {
      throw new ForbiddenException('您不是该家庭的成员');
    }

    // 更新用户的当前家庭
    await this.userModel.findByIdAndUpdate(userId, { familyId });

    // 更新最后活跃时间
    membership.lastActiveAt = new Date();
    await membership.save();

    return membership;
  }

  // 设置默认家庭
  async setDefaultFamily(userId: string, familyId: string): Promise<void> {
    const membership = await this.membershipModel.findOne({
      userId: new Types.ObjectId(userId),
      familyId: new Types.ObjectId(familyId),
      status: MembershipStatus.ACTIVE,
    });

    if (!membership) {
      throw new ForbiddenException('您不是该家庭的成员');
    }

    // 取消原默认家庭
    await this.membershipModel.updateMany(
      { userId: new Types.ObjectId(userId) },
      { isDefault: false },
    );

    // 设置新默认家庭
    membership.isDefault = true;
    await membership.save();

    // 更新用户记录
    await this.userModel.findByIdAndUpdate(userId, { familyId });
  }

  // ============= 查询方法 =============

  // 获取用户的所有家庭
  async getUserFamilies(userId: string): Promise<{
    families: any[];
    currentFamilyId: string;
  }> {
    const memberships = await this.membershipModel
      .find({
        userId: new Types.ObjectId(userId),
        status: MembershipStatus.ACTIVE,
      })
      .populate('familyId')
      .sort({ isDefault: -1, joinedAt: 1 })
      .exec();

    const user = await this.userModel.findById(userId);

    return {
      families: memberships.map((m) => ({
        ...m.toObject(),
        family: m.familyId as any,
      })),
      currentFamilyId: user?.familyId || '',
    };
  }

  // 获取待处理的邀请
  async getPendingInvitations(userId: string): Promise<FamilyMembershipDocument[]> {
    return this.membershipModel
      .find({
        userId: new Types.ObjectId(userId),
        status: MembershipStatus.PENDING,
      })
      .populate('familyId', 'name description')
      .populate('invitedBy', 'username avatar')
      .exec();
  }

  // 获取家庭的所有成员
  async getFamilyMembers(familyId: string): Promise<FamilyMembershipDocument[]> {
    return this.membershipModel
      .find({
        familyId: new Types.ObjectId(familyId),
        status: MembershipStatus.ACTIVE,
      })
      .populate('userId', 'username email avatar')
      .sort({ role: 1, joinedAt: 1 })
      .exec();
  }

  // 获取成员关系
  async getMembership(familyId: string, userId: string): Promise<FamilyMembershipDocument | null> {
    return this.membershipModel.findOne({
      userId: new Types.ObjectId(userId),
      familyId: new Types.ObjectId(familyId),
      status: MembershipStatus.ACTIVE,
    });
  }

  // ============= 成员管理 =============

  // 更新成员角色
  async updateMemberRole(
    familyId: string,
    targetUserId: string,
    newRole: MemberRole,
    operatorId: string,
  ): Promise<FamilyMembershipDocument> {
    // 检查操作者权限
    const operatorMembership = await this.getMembership(familyId, operatorId);
    if (!operatorMembership || !this.canManageRoles(operatorMembership.role)) {
      throw new ForbiddenException('无权修改成员角色');
    }

    // 不能修改owner角色
    const targetMembership = await this.getMembership(familyId, targetUserId);
    if (!targetMembership) {
      throw new NotFoundException('成员不存在');
    }

    if (targetMembership.role === MemberRole.OWNER) {
      throw new ForbiddenException('不能修改所有者角色');
    }

    targetMembership.role = newRole;
    return targetMembership.save();
  }

  // 更新成员信息
  async updateMemberInfo(
    familyId: string,
    userId: string,
    data: { nickname?: string; relationship?: string; notificationsEnabled?: boolean },
  ): Promise<FamilyMembershipDocument> {
    const membership = await this.getMembership(familyId, userId);
    if (!membership) {
      throw new NotFoundException('成员关系不存在');
    }

    if (data.nickname !== undefined) membership.nickname = data.nickname;
    if (data.relationship !== undefined) membership.relationship = data.relationship;
    if (data.notificationsEnabled !== undefined) membership.notificationsEnabled = data.notificationsEnabled;

    return membership.save();
  }

  // 移除成员
  async removeMember(familyId: string, targetUserId: string, operatorId: string): Promise<void> {
    const operatorMembership = await this.getMembership(familyId, operatorId);
    if (!operatorMembership || !this.canRemoveMembers(operatorMembership.role)) {
      throw new ForbiddenException('无权移除成员');
    }

    const targetMembership = await this.getMembership(familyId, targetUserId);
    if (!targetMembership) {
      throw new NotFoundException('成员不存在');
    }

    if (targetMembership.role === MemberRole.OWNER) {
      throw new ForbiddenException('不能移除所有者');
    }

    targetMembership.status = MembershipStatus.LEFT;
    targetMembership.leftAt = new Date();
    await targetMembership.save();

    // 从家庭成员列表移除
    await this.familyModel.findByIdAndUpdate(familyId, {
      $pull: { members: new Types.ObjectId(targetUserId) },
    });

    // 如果这是用户的当前家庭，切换到其他家庭
    const user = await this.userModel.findById(targetUserId);
    if (user?.familyId === familyId) {
      const otherFamily = await this.membershipModel.findOne({
        userId: new Types.ObjectId(targetUserId),
        status: MembershipStatus.ACTIVE,
      });
      await this.userModel.findByIdAndUpdate(targetUserId, {
        familyId: otherFamily?.familyId?.toString() || '',
      });
    }
  }

  // 离开家庭
  async leaveFamily(userId: string, familyId: string): Promise<void> {
    const membership = await this.getMembership(familyId, userId);
    if (!membership) {
      throw new NotFoundException('您不是该家庭的成员');
    }

    if (membership.role === MemberRole.OWNER) {
      // 检查是否有其他成员
      const memberCount = await this.membershipModel.countDocuments({
        familyId: new Types.ObjectId(familyId),
        status: MembershipStatus.ACTIVE,
      });

      if (memberCount > 1) {
        throw new BadRequestException('所有者离开前需要先转让所有权');
      }
    }

    membership.status = MembershipStatus.LEFT;
    membership.leftAt = new Date();
    await membership.save();

    // 从家庭成员列表移除
    await this.familyModel.findByIdAndUpdate(familyId, {
      $pull: { members: new Types.ObjectId(userId) },
    });

    // 切换到其他家庭
    const user = await this.userModel.findById(userId);
    if (user?.familyId === familyId) {
      const otherFamily = await this.membershipModel.findOne({
        userId: new Types.ObjectId(userId),
        status: MembershipStatus.ACTIVE,
      });
      await this.userModel.findByIdAndUpdate(userId, {
        familyId: otherFamily?.familyId?.toString() || '',
      });
    }
  }

  // 转让所有权
  async transferOwnership(familyId: string, currentOwnerId: string, newOwnerId: string): Promise<void> {
    const currentOwnerMembership = await this.getMembership(familyId, currentOwnerId);
    if (!currentOwnerMembership || currentOwnerMembership.role !== MemberRole.OWNER) {
      throw new ForbiddenException('只有所有者可以转让所有权');
    }

    const newOwnerMembership = await this.getMembership(familyId, newOwnerId);
    if (!newOwnerMembership) {
      throw new NotFoundException('目标用户不是家庭成员');
    }

    // 转让
    currentOwnerMembership.role = MemberRole.ADMIN;
    newOwnerMembership.role = MemberRole.OWNER;

    await Promise.all([currentOwnerMembership.save(), newOwnerMembership.save()]);

    // 更新家庭创建者
    await this.familyModel.findByIdAndUpdate(familyId, {
      createdBy: newOwnerId,
    });
  }

  // ============= 权限检查辅助方法 =============

  private canInvite(role: MemberRole): boolean {
    return [MemberRole.OWNER, MemberRole.ADMIN, MemberRole.EDITOR].includes(role);
  }

  private canManageRoles(role: MemberRole): boolean {
    return [MemberRole.OWNER, MemberRole.ADMIN].includes(role);
  }

  private canRemoveMembers(role: MemberRole): boolean {
    return [MemberRole.OWNER, MemberRole.ADMIN].includes(role);
  }
}
