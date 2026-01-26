import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GoalDocument = Goal & Document;

export enum GoalCategory {
  FINANCE = 'finance',         // 财务目标
  HEALTH = 'health',           // 健康目标
  EDUCATION = 'education',     // 学习目标
  TRAVEL = 'travel',           // 旅行目标
  HOME = 'home',               // 家居/装修目标
  RELATIONSHIP = 'relationship', // 家庭关系目标
  CAREER = 'career',           // 职业目标
  HOBBY = 'hobby',             // 兴趣爱好
  CUSTOM = 'custom',           // 自定义
}

export enum GoalStatus {
  NOT_STARTED = 'not_started', // 未开始
  IN_PROGRESS = 'in_progress', // 进行中
  COMPLETED = 'completed',     // 已完成
  PAUSED = 'paused',           // 暂停
  CANCELLED = 'cancelled',     // 已取消
}

export enum GoalPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Schema({ timestamps: true })
export class Milestone {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ default: false })
  isCompleted: boolean;

  @Prop()
  completedAt: Date;

  @Prop()
  targetDate: Date;

  @Prop({ default: 0 })
  progress: number; // 0-100
}

@Schema({ timestamps: true })
export class GoalUpdate {
  @Prop({ type: String, ref: 'User', required: true })
  userId: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  progress: number; // 更新后的进度

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop()
  createdAt: Date;
}

@Schema({ timestamps: true })
export class Goal {
  @Prop({ required: true })
  title: string; // 目标标题

  @Prop()
  description: string; // 详细描述

  @Prop({ enum: GoalCategory, default: GoalCategory.CUSTOM })
  category: GoalCategory;

  @Prop({ enum: GoalStatus, default: GoalStatus.NOT_STARTED })
  status: GoalStatus;

  @Prop({ enum: GoalPriority, default: GoalPriority.MEDIUM })
  priority: GoalPriority;

  @Prop({ required: true })
  startDate: Date; // 开始日期

  @Prop()
  targetDate: Date; // 目标完成日期

  @Prop()
  completedDate: Date; // 实际完成日期

  @Prop({ default: 0 })
  progress: number; // 总体进度 0-100

  @Prop()
  targetValue: number; // 目标值（如存款金额）

  @Prop({ default: 0 })
  currentValue: number; // 当前值

  @Prop()
  unit: string; // 单位（元、公里、本等）

  @Prop({ type: [Milestone], default: [] })
  milestones: Milestone[]; // 里程碑

  @Prop({ type: [GoalUpdate], default: [] })
  updates: GoalUpdate[]; // 进度更新

  @Prop({ type: [{ type: String, ref: 'User' }], default: [] })
  participants: string[]; // 参与者

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop()
  icon: string;

  @Prop()
  color: string;

  @Prop()
  coverImage: string; // 封面图

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false })
  isPrivate: boolean; // 私密目标

  @Prop({ default: true })
  enableReminder: boolean; // 是否开启提醒
}

export const GoalSchema = SchemaFactory.createForClass(Goal);

// 索引
GoalSchema.index({ familyId: 1, status: 1 });
GoalSchema.index({ familyId: 1, category: 1 });
GoalSchema.index({ participants: 1 });


