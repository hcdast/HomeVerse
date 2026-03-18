import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VoteDocument = Vote & Document;

// 投票类型
export enum VoteType {
  SINGLE = 'single',       // 单选
  MULTIPLE = 'multiple',   // 多选
  RANKING = 'ranking',     // 排序
}

// 投票状态
export enum VoteStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

// 投票选项
@Schema({ _id: false })
class VoteOption {
  @Prop({ type: Types.ObjectId, auto: true })
  _id: Types.ObjectId;

  @Prop({ required: true })
  text: string;

  @Prop()
  description: string;

  @Prop()
  image: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  voters: Types.ObjectId[];

  @Prop({ default: 0 })
  voteCount: number;
}

const VoteOptionSchema = SchemaFactory.createForClass(VoteOption);

@Schema({ timestamps: true })
export class Vote {
  @Prop({ type: Types.ObjectId, ref: 'Family', required: true, index: true })
  familyId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true, enum: VoteType, default: VoteType.SINGLE })
  type: VoteType;

  @Prop({ required: true, enum: VoteStatus, default: VoteStatus.ACTIVE })
  status: VoteStatus;

  @Prop({ type: [VoteOptionSchema], default: [] })
  options: VoteOption[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop()
  expiresAt: Date;

  @Prop({ default: false })
  isAnonymous: boolean;

  @Prop({ default: true })
  allowChangeVote: boolean;

  @Prop({ default: 1 })
  maxSelections: number; // 多选时最多可选数量

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  participants: Types.ObjectId[]; // 已参与投票的用户

  @Prop()
  category: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  icon: string;

  @Prop({ type: Object })
  result: {
    winnerId?: Types.ObjectId;
    winnerText?: string;
    totalVotes?: number;
    participationRate?: number;
  };
}

export const VoteSchema = SchemaFactory.createForClass(Vote);

// 索引
VoteSchema.index({ familyId: 1, status: 1 });
VoteSchema.index({ familyId: 1, createdAt: -1 });
VoteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { status: 'active' } });
