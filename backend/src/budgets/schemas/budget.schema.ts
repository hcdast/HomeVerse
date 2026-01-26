import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BudgetDocument = Budget & Document;

@Schema({ timestamps: true })
export class CategoryBudget {
  @Prop({ required: true })
  category: string; // 分类名称

  @Prop({ required: true })
  budgetAmount: number; // 预算金额

  @Prop({ default: 0 })
  spent: number; // 已花费（手动更新或通过财务模块计算）

  @Prop({ default: 80 })
  alertThreshold: number; // 警告阈值百分比（如80表示花费达80%时警告）

  @Prop()
  icon: string; // 图标

  @Prop()
  color: string; // 颜色
}

@Schema({ timestamps: true })
export class SavingsGoal {
  @Prop({ required: true })
  name: string; // 储蓄目标名称

  @Prop({ required: true })
  targetAmount: number; // 目标金额

  @Prop({ default: 0 })
  currentAmount: number; // 当前存款

  @Prop()
  deadline: Date; // 截止日期

  @Prop()
  icon: string; // 图标

  @Prop()
  notes: string;
}

@Schema({ timestamps: true })
export class Budget {
  @Prop({ required: true })
  year: number; // 年份

  @Prop({ required: true })
  month: number; // 月份 (1-12)

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ type: [CategoryBudget], default: [] })
  categories: CategoryBudget[]; // 分类预算

  @Prop({ required: true, default: 0 })
  totalBudget: number; // 总预算

  @Prop({ default: 0 })
  totalSpent: number; // 总支出

  @Prop({ default: 0 })
  totalIncome: number; // 总收入

  @Prop({ type: [SavingsGoal], default: [] })
  savingsGoals: SavingsGoal[]; // 储蓄目标

  @Prop()
  notes: string; // 备注

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;

  @Prop({ default: false })
  isLocked: boolean; // 锁定后不可修改
}

export const BudgetSchema = SchemaFactory.createForClass(Budget);

// 复合唯一索引
BudgetSchema.index({ familyId: 1, year: 1, month: 1 }, { unique: true });

