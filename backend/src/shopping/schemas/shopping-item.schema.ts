import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ShoppingItemDocument = ShoppingItem & Document;

export enum ShoppingCategory {
  FOOD = 'food',           // 食品
  DAILY = 'daily',         // 日用品
  APPLIANCE = 'appliance', // 家电
  CLOTHING = 'clothing',   // 服装
  OTHER = 'other',         // 其他
}

export enum ShoppingPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum ShoppingStatus {
  PENDING = 'pending',       // 待购买
  PURCHASED = 'purchased',   // 已购买
  CANCELLED = 'cancelled',   // 已取消
}

export enum RecurringType {
  ONCE = 'once',       // 一次性
  WEEKLY = 'weekly',   // 每周
  BIWEEKLY = 'biweekly', // 每两周
  MONTHLY = 'monthly', // 每月
}

@Schema({ timestamps: true })
export class ShoppingItem {
  @Prop({ required: true })
  name: string; // 物品名称

  @Prop({ enum: ShoppingCategory, default: ShoppingCategory.OTHER })
  category: ShoppingCategory; // 分类

  @Prop({ default: 1 })
  quantity: number; // 数量

  @Prop({ default: '个' })
  unit: string; // 单位

  @Prop({ enum: ShoppingPriority, default: ShoppingPriority.MEDIUM })
  priority: ShoppingPriority; // 优先级

  @Prop({ enum: ShoppingStatus, default: ShoppingStatus.PENDING })
  status: ShoppingStatus; // 状态

  @Prop({ type: String, ref: 'User' })
  assignedTo: string; // 分配给谁购买

  @Prop()
  estimatedPrice: number; // 预估价格

  @Prop()
  actualPrice: number; // 实际价格

  @Prop({ type: String, ref: 'User' })
  purchasedBy: string; // 实际购买人

  @Prop()
  purchasedAt: Date; // 购买时间

  @Prop({ enum: RecurringType, default: RecurringType.ONCE })
  recurringType: RecurringType; // 周期性购买

  @Prop()
  nextRecurringDate: Date; // 下次自动添加日期

  @Prop()
  notes: string; // 备注

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const ShoppingItemSchema = SchemaFactory.createForClass(ShoppingItem);

// 索引
ShoppingItemSchema.index({ familyId: 1, status: 1 });
ShoppingItemSchema.index({ familyId: 1, createdAt: -1 });

