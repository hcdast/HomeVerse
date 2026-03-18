import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

// 订阅类型
export enum SubscriptionType {
  STREAMING = 'streaming',       // 流媒体（视频、音乐）
  SOFTWARE = 'software',         // 软件服务
  INSURANCE = 'insurance',       // 保险
  MEMBERSHIP = 'membership',     // 会员
  UTILITY = 'utility',           // 公用事业
  EDUCATION = 'education',       // 教育
  HEALTH = 'health',             // 健康
  OTHER = 'other',               // 其他
}

// 计费周期
export enum BillingCycle {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUALLY = 'semi_annually',
  ANNUALLY = 'annually',
  CUSTOM = 'custom',
}

// 订阅状态
export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'Family', required: true, index: true })
  familyId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true, enum: SubscriptionType })
  type: SubscriptionType;

  @Prop({ required: true, enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @Prop({ required: true })
  cost: number;

  @Prop({ default: 'CNY' })
  currency: string;

  @Prop({ required: true, enum: BillingCycle })
  billingCycle: BillingCycle;

  @Prop()
  customCycleDays: number; // 自定义周期天数

  @Prop({ required: true })
  startDate: Date;

  @Prop()
  endDate: Date;

  @Prop({ required: true })
  nextBillingDate: Date;

  @Prop()
  lastBillingDate: Date;

  @Prop()
  provider: string; // 提供商

  @Prop()
  accountEmail: string; // 账号邮箱

  @Prop()
  website: string;

  @Prop()
  icon: string;

  @Prop()
  color: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  managedBy: Types.ObjectId; // 管理人

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  sharedWith: Types.ObjectId[]; // 共享成员

  @Prop({ default: true })
  reminderEnabled: boolean;

  @Prop({ default: 3 })
  reminderDaysBefore: number; // 提前几天提醒

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  notes: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({
    type: [{
      date: Date,
      amount: Number,
      status: { type: String, enum: ['paid', 'pending', 'failed'] },
      notes: String,
    }],
    default: [],
  })
  paymentHistory: {
    date: Date;
    amount: number;
    status: string;
    notes: string;
  }[];
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

// 索引
SubscriptionSchema.index({ familyId: 1, status: 1 });
SubscriptionSchema.index({ familyId: 1, nextBillingDate: 1 });
SubscriptionSchema.index({ familyId: 1, type: 1 });
