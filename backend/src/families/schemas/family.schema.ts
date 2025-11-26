import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FamilyDocument = Family & Document;

// 家庭设置子文档
@Schema({ _id: false })
export class FamilySettings {
  @Prop({ default: 10 * 1024 * 1024 * 1024 }) // 默认10GB
  storageLimit: number; // 存储限制（字节）

  @Prop({ default: 'private', enum: ['public', 'private'] })
  privacy: string; // 隐私设置
}

const FamilySettingsSchema = SchemaFactory.createForClass(FamilySettings);

@Schema({ timestamps: true })
export class Family {
  @Prop({ required: true })
  name: string; // 家庭名称

  @Prop()
  description: string; // 家庭描述

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string; // 创建者ID

  @Prop({ type: [String], ref: 'User', default: [] })
  members: string[]; // 成员列表

  @Prop({ type: FamilySettingsSchema, default: () => ({}) })
  settings: FamilySettings; // 家庭设置

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const FamilySchema = SchemaFactory.createForClass(Family);

