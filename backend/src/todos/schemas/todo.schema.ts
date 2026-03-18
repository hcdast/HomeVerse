import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TodoDocument = Todo & Document;

// 重复频率枚举
export enum RecurringFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

// 重复规则类型
export class RecurringRule {
  enabled: boolean;
  frequency: RecurringFrequency;
  interval: number; // 间隔（每 N 天/周/月）
  daysOfWeek?: number[]; // 每周的哪几天（0-6，周日到周六）
  dayOfMonth?: number; // 每月的第几天
  endDate?: Date; // 结束日期
  count?: number; // 重复次数
}

@Schema({ timestamps: true })
export class Todo {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ default: false })
  completed: boolean;

  @Prop()
  completedAt: Date;

  @Prop()
  dueDate: Date;

  @Prop({ enum: ['low', 'medium', 'high'], default: 'medium' })
  priority: string;

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: String, ref: 'User' })
  assignedTo: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  // 重复任务相关字段
  @Prop({ type: Object })
  recurring: RecurringRule;

  @Prop({ type: Types.ObjectId, ref: 'Todo' })
  parentTodoId: Types.ObjectId; // 父任务ID（由重复任务生成的实例）

  @Prop({ default: false })
  isRecurringInstance: boolean; // 是否是重复任务的实例

  @Prop()
  originalDueDate: Date; // 原始截止日期（重复实例）
}

export const TodoSchema = SchemaFactory.createForClass(Todo);

// 索引
TodoSchema.index({ familyId: 1, dueDate: 1 });
TodoSchema.index({ familyId: 1, completed: 1 });
TodoSchema.index({ parentTodoId: 1 });