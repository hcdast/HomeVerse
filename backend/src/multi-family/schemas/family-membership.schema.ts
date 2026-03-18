import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FamilyMembershipDocument = FamilyMembership & Document;

// 成员角色
export enum MemberRole {
  OWNER = 'owner',     // 所有者（创建者）
  ADMIN = 'admin',     // 管理员
  EDITOR = 'editor',   // 编辑者
  VIEWER = 'viewer',   // 访客
  MEMBER = 'member',   // 普通成员
}

// 成员状态
export enum MembershipStatus {
  PENDING = 'pending',     // 待接受邀请
  ACTIVE = 'active',       // 活跃
  INACTIVE = 'inactive',   // 停用
  LEFT = 'left',           // 已离开
}

// 家庭成员关系表 - 支持多家庭
@Schema({ timestamps: true })
export class FamilyMembership {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Family', required: true, index: true })
  familyId: Types.ObjectId;

  @Prop({ required: true, enum: MemberRole, default: MemberRole.MEMBER })
  role: MemberRole;

  @Prop({ required: true, enum: MembershipStatus, default: MembershipStatus.ACTIVE })
  status: MembershipStatus;

  @Prop()
  nickname: string; // 在该家庭中的昵称

  @Prop()
  relationship: string; // 与家庭的关系（如：父亲、母亲、儿子等）

  @Prop({ type: Object, default: {} })
  permissions: {
    albums?: { read: boolean; write: boolean; delete: boolean };
    files?: { read: boolean; write: boolean; delete: boolean };
    articles?: { read: boolean; write: boolean; delete: boolean };
    members?: { read: boolean; write: boolean; delete: boolean };
    finance?: { read: boolean; write: boolean; delete: boolean };
    settings?: { read: boolean; write: boolean };
  };

  @Prop({ type: Types.ObjectId, ref: 'User' })
  invitedBy: Types.ObjectId; // 邀请人

  @Prop()
  joinedAt: Date;

  @Prop()
  leftAt: Date;

  @Prop({ default: false })
  isDefault: boolean; // 是否为默认家庭

  @Prop({ default: true })
  notificationsEnabled: boolean; // 是否接收该家庭的通知

  @Prop({ type: Date })
  lastActiveAt: Date; // 最后活跃时间
}

export const FamilyMembershipSchema = SchemaFactory.createForClass(FamilyMembership);

// 复合唯一索引
FamilyMembershipSchema.index({ userId: 1, familyId: 1 }, { unique: true });
FamilyMembershipSchema.index({ familyId: 1, status: 1 });
FamilyMembershipSchema.index({ userId: 1, isDefault: 1 });
