import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TransactionDocument = Transaction & Document;

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ required: true, enum: TransactionType })
  type: TransactionType; // 收入/支出

  @Prop({ required: true })
  amount: number; // 金额

  @Prop({ required: true })
  category: string; // 分类（食品、交通、教育等）

  @Prop({ required: true })
  description: string; // 描述

  @Prop({ required: true })
  date: Date; // 日期

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: [String], default: [] })
  attachments: string[]; // 收据照片

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

