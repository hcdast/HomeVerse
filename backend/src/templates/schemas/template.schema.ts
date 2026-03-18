import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TemplateDocument = Template & Document;

export enum TemplateCategory {
  SHOPPING = 'shopping',
  RECIPE = 'recipe',
  CHORE = 'chore',
  TODO = 'todo',
  CALENDAR = 'calendar',
  BUDGET = 'budget',
  TRAVEL = 'travel',
  CUSTOM = 'custom',
}

@Schema({ timestamps: true })
export class Template {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true, enum: TemplateCategory })
  category: TemplateCategory;

  @Prop()
  icon: string;

  @Prop()
  color: string;

  @Prop({ type: Types.ObjectId, ref: 'Family' })
  familyId: Types.ObjectId; // 家庭自定义模板，null 表示系统模板

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ default: false })
  isSystem: boolean; // 是否是系统预设模板

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object, required: true })
  content: Record<string, any>; // 模板内容

  @Prop({ default: 0 })
  usageCount: number; // 使用次数

  @Prop({ type: [String], default: [] })
  tags: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const TemplateSchema = SchemaFactory.createForClass(Template);

// 索引
TemplateSchema.index({ familyId: 1, category: 1 });
TemplateSchema.index({ isSystem: 1 });



