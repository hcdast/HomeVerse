import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PointDocument = Point & Document;

// 积分来源类型
export enum PointSource {
  CHORE = 'chore',           // 家务完成
  TODO = 'todo',             // 待办完成
  GOAL = 'goal',             // 目标达成
  CHALLENGE = 'challenge',   // 挑战完成
  REWARD = 'reward',         // 奖励发放
  REDEEM = 'redeem',         // 积分兑换（扣除）
  BONUS = 'bonus',           // 额外奖励
  PENALTY = 'penalty',       // 惩罚扣除
  TRANSFER_IN = 'transfer_in',   // 转入
  TRANSFER_OUT = 'transfer_out', // 转出
}

// 积分交易类型
export enum PointTransactionType {
  EARN = 'earn',    // 获得
  SPEND = 'spend',  // 消费
}

// 积分记录
@Schema({ timestamps: true })
export class Point {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Family', required: true, index: true })
  familyId: Types.ObjectId;

  @Prop({ required: true, enum: PointTransactionType })
  type: PointTransactionType;

  @Prop({ required: true, enum: PointSource })
  source: PointSource;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  balance: number; // 交易后余额

  @Prop()
  description: string;

  @Prop({ type: Object })
  metadata: {
    relatedId?: string;      // 关联的家务/待办/目标ID
    relatedType?: string;    // 关联类型
    rewardId?: string;       // 兑换的奖励ID
    transferTo?: string;     // 转账目标用户ID
    transferFrom?: string;   // 转账来源用户ID
  };

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;
}

export const PointSchema = SchemaFactory.createForClass(Point);

// 复合索引
PointSchema.index({ userId: 1, createdAt: -1 });
PointSchema.index({ familyId: 1, createdAt: -1 });

// 用户积分余额（聚合视图）
@Schema({ timestamps: true })
export class PointBalance {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Family', required: true })
  familyId: Types.ObjectId;

  @Prop({ default: 0 })
  balance: number;

  @Prop({ default: 0 })
  totalEarned: number;

  @Prop({ default: 0 })
  totalSpent: number;

  @Prop({ default: 0 })
  level: number; // 等级

  @Prop({ default: '' })
  title: string; // 称号

  @Prop()
  lastEarnedAt: Date;
}

export type PointBalanceDocument = PointBalance & Document;
export const PointBalanceSchema = SchemaFactory.createForClass(PointBalance);

// 奖励商品
@Schema({ timestamps: true })
export class Reward {
  @Prop({ type: Types.ObjectId, ref: 'Family', required: true, index: true })
  familyId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop()
  icon: string;

  @Prop({ required: true })
  cost: number; // 所需积分

  @Prop({ default: -1 })
  stock: number; // 库存，-1表示无限

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ default: 0 })
  redeemCount: number; // 兑换次数
}

export type RewardDocument = Reward & Document;
export const RewardSchema = SchemaFactory.createForClass(Reward);

// 兑换记录
@Schema({ timestamps: true })
export class Redemption {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Family', required: true })
  familyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Reward', required: true })
  rewardId: Types.ObjectId;

  @Prop({ required: true })
  rewardName: string;

  @Prop({ required: true })
  cost: number;

  @Prop({ default: 'pending', enum: ['pending', 'approved', 'rejected', 'completed'] })
  status: string;

  @Prop()
  notes: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  processedBy: Types.ObjectId;

  @Prop()
  processedAt: Date;
}

export type RedemptionDocument = Redemption & Document;
export const RedemptionSchema = SchemaFactory.createForClass(Redemption);
