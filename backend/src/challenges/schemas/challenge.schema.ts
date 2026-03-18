import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChallengeDocument = Challenge & Document;

// 挑战类型
export enum ChallengeType {
  DAILY = 'daily',         // 每日挑战
  WEEKLY = 'weekly',       // 每周挑战
  MONTHLY = 'monthly',     // 每月挑战
  CUSTOM = 'custom',       // 自定义
}

// 挑战状态
export enum ChallengeStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// 挑战分类
export enum ChallengeCategory {
  HEALTH = 'health',       // 健康
  LEARNING = 'learning',   // 学习
  HOUSEWORK = 'housework', // 家务
  SAVING = 'saving',       // 储蓄
  EXERCISE = 'exercise',   // 运动
  READING = 'reading',     // 阅读
  BONDING = 'bonding',     // 家庭联络
  OTHER = 'other',         // 其他
}

// 参与者进度
@Schema({ _id: false })
class ParticipantProgress {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ default: 0 })
  currentProgress: number;

  @Prop({ default: false })
  isCompleted: boolean;

  @Prop()
  completedAt: Date;

  @Prop({ default: 0 })
  streakDays: number; // 连续天数

  @Prop({
    type: [{
      date: Date,
      value: Number,
      notes: String,
      proofUrl: String,
    }],
    default: [],
  })
  checkIns: {
    date: Date;
    value: number;
    notes: string;
    proofUrl: string;
  }[];

  @Prop({ default: 0 })
  points: number; // 获得积分
}

const ParticipantProgressSchema = SchemaFactory.createForClass(ParticipantProgress);

// 里程碑
@Schema({ _id: false })
class Milestone {
  @Prop({ type: Types.ObjectId, auto: true })
  _id: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  targetValue: number;

  @Prop()
  reward: string;

  @Prop({ default: 0 })
  rewardPoints: number;
}

const MilestoneSchema = SchemaFactory.createForClass(Milestone);

@Schema({ timestamps: true })
export class Challenge {
  @Prop({ type: Types.ObjectId, ref: 'Family', required: true, index: true })
  familyId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true, enum: ChallengeType })
  type: ChallengeType;

  @Prop({ required: true, enum: ChallengeStatus, default: ChallengeStatus.DRAFT })
  status: ChallengeStatus;

  @Prop({ required: true, enum: ChallengeCategory })
  category: ChallengeCategory;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true })
  targetValue: number; // 目标值

  @Prop({ default: '次' })
  unit: string; // 单位

  @Prop({ type: [ParticipantProgressSchema], default: [] })
  participants: ParticipantProgress[];

  @Prop({ type: [MilestoneSchema], default: [] })
  milestones: Milestone[];

  @Prop()
  icon: string;

  @Prop()
  color: string;

  @Prop()
  coverImage: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  reward: string; // 奖励描述

  @Prop({ default: 0 })
  rewardPoints: number; // 完成奖励积分

  @Prop({ default: false })
  isTeamChallenge: boolean; // 是否团队挑战

  @Prop({ default: 0 })
  teamProgress: number; // 团队总进度

  @Prop({ type: Object })
  rules: {
    minCheckInsPerDay?: number;
    maxCheckInsPerDay?: number;
    requireProof?: boolean;
    autoComplete?: boolean;
  };

  @Prop({
    type: [{
      userId: { type: Types.ObjectId, ref: 'User' },
      message: String,
      createdAt: Date,
    }],
    default: [],
  })
  encouragements: {
    userId: Types.ObjectId;
    message: string;
    createdAt: Date;
  }[];
}

export const ChallengeSchema = SchemaFactory.createForClass(Challenge);

// 索引
ChallengeSchema.index({ familyId: 1, status: 1 });
ChallengeSchema.index({ familyId: 1, category: 1 });
ChallengeSchema.index({ startDate: 1, endDate: 1 });
