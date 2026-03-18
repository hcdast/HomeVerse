import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DigestDocument = Digest & Document;

// 摘要类型
export enum DigestType {
  DAILY = 'daily',     // 日报
  WEEKLY = 'weekly',   // 周报
  MONTHLY = 'monthly', // 月报
}

// 摘要状态
export enum DigestStatus {
  GENERATING = 'generating',  // 生成中
  COMPLETED = 'completed',    // 已完成
  FAILED = 'failed',          // 生成失败
  SENT = 'sent',              // 已发送
}

// 活动摘要数据
@Schema({ _id: false })
class ActivitySummary {
  @Prop({ default: 0 })
  todosCompleted: number;

  @Prop({ default: 0 })
  todosCreated: number;

  @Prop({ default: 0 })
  choresCompleted: number;

  @Prop({ default: 0 })
  photosUploaded: number;

  @Prop({ default: 0 })
  articlesCreated: number;

  @Prop({ default: 0 })
  eventsCreated: number;

  @Prop({ default: 0 })
  messagesCount: number;

  @Prop({ default: 0 })
  transactionsCount: number;

  @Prop({ default: 0 })
  totalIncome: number;

  @Prop({ default: 0 })
  totalExpense: number;

  @Prop({ default: 0 })
  pointsEarned: number;
}

const ActivitySummarySchema = SchemaFactory.createForClass(ActivitySummary);

// 成员贡献数据
@Schema({ _id: false })
class MemberContribution {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop()
  username: string;

  @Prop({ default: 0 })
  todosCompleted: number;

  @Prop({ default: 0 })
  choresCompleted: number;

  @Prop({ default: 0 })
  photosUploaded: number;

  @Prop({ default: 0 })
  pointsEarned: number;
}

const MemberContributionSchema = SchemaFactory.createForClass(MemberContribution);

// 亮点事件
@Schema({ _id: false })
class Highlight {
  @Prop()
  type: string;  // 'achievement' | 'milestone' | 'event' | 'announcement'

  @Prop()
  title: string;

  @Prop()
  description: string;

  @Prop()
  icon: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  relatedUser: Types.ObjectId;
}

const HighlightSchema = SchemaFactory.createForClass(Highlight);

@Schema({ timestamps: true })
export class Digest {
  @Prop({ type: Types.ObjectId, ref: 'Family', required: true, index: true })
  familyId: Types.ObjectId;

  @Prop({ required: true, enum: DigestType })
  type: DigestType;

  @Prop({ required: true, enum: DigestStatus, default: DigestStatus.GENERATING })
  status: DigestStatus;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ type: ActivitySummarySchema, default: () => ({}) })
  activitySummary: ActivitySummary;

  @Prop({ type: [MemberContributionSchema], default: [] })
  memberContributions: MemberContribution[];

  @Prop({ type: [HighlightSchema], default: [] })
  highlights: Highlight[];

  @Prop()
  aiSummary: string;  // AI生成的总结语

  @Prop()
  aiSuggestions: string;  // AI生成的建议

  @Prop({ type: [String], default: [] })
  upcomingEvents: string[];  // 即将到来的事件提醒

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  readBy: Types.ObjectId[];

  @Prop()
  sentAt: Date;

  @Prop()
  errorMessage: string;
}

export const DigestSchema = SchemaFactory.createForClass(Digest);

// 索引
DigestSchema.index({ familyId: 1, type: 1, startDate: -1 });
DigestSchema.index({ familyId: 1, status: 1 });

// 摘要订阅设置
@Schema({ timestamps: true })
export class DigestSubscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Family', required: true })
  familyId: Types.ObjectId;

  @Prop({ default: true })
  dailyEnabled: boolean;

  @Prop({ default: true })
  weeklyEnabled: boolean;

  @Prop({ default: false })
  monthlyEnabled: boolean;

  @Prop({ default: '08:00' })
  preferredTime: string;  // 首选发送时间

  @Prop({ default: true })
  emailEnabled: boolean;

  @Prop({ default: true })
  pushEnabled: boolean;
}

export type DigestSubscriptionDocument = DigestSubscription & Document;
export const DigestSubscriptionSchema = SchemaFactory.createForClass(DigestSubscription);

DigestSubscriptionSchema.index({ userId: 1, familyId: 1 }, { unique: true });
