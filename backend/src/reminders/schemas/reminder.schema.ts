import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReminderDocument = Reminder & Document;

export enum ReminderType {
  ONE_TIME = 'one_time',       // 一次性提醒
  DAILY = 'daily',             // 每日
  WEEKLY = 'weekly',           // 每周
  MONTHLY = 'monthly',         // 每月
  YEARLY = 'yearly',           // 每年
  CUSTOM = 'custom',           // 自定义
}

export enum ReminderCategory {
  MEDICATION = 'medication',   // 用药提醒
  BILL = 'bill',               // 账单提醒
  BIRTHDAY = 'birthday',       // 生日提醒
  ANNIVERSARY = 'anniversary', // 纪念日提醒
  APPOINTMENT = 'appointment', // 预约提醒
  TASK = 'task',               // 任务提醒
  PLANT = 'plant',             // 浇花/宠物
  MAINTENANCE = 'maintenance', // 维护提醒(车辆保养等)
  CUSTOM = 'custom',           // 自定义
}

export enum ReminderPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Schema({ timestamps: true })
export class Reminder {
  @Prop({ required: true })
  title: string; // 提醒标题

  @Prop()
  description: string; // 详细描述

  @Prop({ enum: ReminderType, default: ReminderType.ONE_TIME })
  type: ReminderType; // 提醒类型

  @Prop({ enum: ReminderCategory, default: ReminderCategory.CUSTOM })
  category: ReminderCategory; // 分类

  @Prop({ enum: ReminderPriority, default: ReminderPriority.MEDIUM })
  priority: ReminderPriority; // 优先级

  @Prop({ required: true })
  reminderTime: Date; // 提醒时间

  @Prop()
  endDate: Date; // 结束日期（循环提醒的截止日期）

  @Prop({ type: [Number], default: [] })
  weekDays: number[]; // 每周几（0-6，周日-周六）

  @Prop()
  monthDay: number; // 每月几号

  @Prop({ type: [Number], default: [0, 15, 60] })
  advanceMinutes: number[]; // 提前多少分钟提醒

  @Prop({ default: true })
  isActive: boolean; // 是否启用

  @Prop({ default: false })
  isSnoozed: boolean; // 是否已延后

  @Prop()
  snoozeUntil: Date; // 延后到什么时候

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: [{ type: String, ref: 'User' }], default: [] })
  assignees: string[]; // 提醒对象（可以是多人）

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop()
  icon: string;

  @Prop()
  color: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: 0 })
  completedCount: number; // 完成次数

  @Prop()
  lastTriggeredAt: Date; // 上次触发时间

  @Prop()
  nextTriggerAt: Date; // 下次触发时间

  @Prop({ type: Object })
  linkedEntity: {
    type: string; // 关联类型：anniversary, todo, health, etc
    id: string;   // 关联ID
  };
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);

// 索引
ReminderSchema.index({ familyId: 1, isActive: 1 });
ReminderSchema.index({ familyId: 1, nextTriggerAt: 1 });
ReminderSchema.index({ assignees: 1, isActive: 1 });


