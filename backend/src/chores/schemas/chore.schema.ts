import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChoreDocument = Chore & Document;

export enum ChoreCategory {
  CLEANING = 'cleaning',     // 清洁
  COOKING = 'cooking',       // 烹饪
  LAUNDRY = 'laundry',       // 洗衣
  ORGANIZING = 'organizing', // 整理
  SHOPPING = 'shopping',     // 采购
  MAINTENANCE = 'maintenance', // 维护
  PET_CARE = 'pet_care',     // 宠物护理
  OTHER = 'other',           // 其他
}

export enum ChoreFrequency {
  ONCE = 'once',         // 一次性
  DAILY = 'daily',       // 每天
  WEEKLY = 'weekly',     // 每周
  BIWEEKLY = 'biweekly', // 每两周
  MONTHLY = 'monthly',   // 每月
}

export enum ChoreStatus {
  PENDING = 'pending',     // 待完成
  IN_PROGRESS = 'in_progress', // 进行中
  COMPLETED = 'completed', // 已完成
  SKIPPED = 'skipped',     // 跳过
}

@Schema({ timestamps: true })
export class ChoreCompletion {
  @Prop({ type: String, ref: 'User', required: true })
  completedBy: string;

  @Prop({ required: true })
  completedAt: Date;

  @Prop({ min: 1, max: 5 })
  rating: number; // 完成评分

  @Prop()
  notes: string;

  @Prop({ default: 0 })
  pointsEarned: number;
}

@Schema({ timestamps: true })
export class Chore {
  @Prop({ required: true })
  name: string; // 家务名称

  @Prop()
  description: string; // 描述

  @Prop({ enum: ChoreCategory, default: ChoreCategory.OTHER })
  category: ChoreCategory; // 分类

  @Prop({ enum: ChoreFrequency, default: ChoreFrequency.ONCE })
  frequency: ChoreFrequency; // 频率

  @Prop({ type: String, ref: 'User' })
  assignedTo: string; // 当前分配给谁

  @Prop({ default: false })
  rotationEnabled: boolean; // 是否开启轮换

  @Prop({ type: [{ type: String, ref: 'User' }], default: [] })
  rotationMembers: string[]; // 轮换成员列表

  @Prop({ default: 0 })
  currentRotationIndex: number; // 当前轮换索引

  @Prop()
  dueDate: Date; // 截止日期

  @Prop()
  dueTime: string; // 截止时间 (如 "09:00")

  @Prop({ type: [Number], default: [] })
  weekDays: number[]; // 每周哪几天 (0-6, 0=周日)

  @Prop({ default: 10 })
  points: number; // 完成可获得的积分

  @Prop({ enum: ChoreStatus, default: ChoreStatus.PENDING })
  status: ChoreStatus;

  @Prop({ type: [ChoreCompletion], default: [] })
  completionHistory: ChoreCompletion[]; // 完成历史

  @Prop()
  lastCompletedAt: Date;

  @Prop()
  nextDueDate: Date; // 下次应完成日期

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  icon: string; // 图标
}

export const ChoreSchema = SchemaFactory.createForClass(Chore);

// 索引
ChoreSchema.index({ familyId: 1, status: 1 });
ChoreSchema.index({ familyId: 1, assignedTo: 1 });
ChoreSchema.index({ familyId: 1, nextDueDate: 1 });

