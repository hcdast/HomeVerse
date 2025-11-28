import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RecipeDocument = Recipe & Document;

@Schema({ timestamps: true })
export class Recipe {
  @Prop({ required: true })
  name: string; // 食谱名称

  @Prop()
  description: string; // 描述

  @Prop({ type: [{ name: String, amount: String, unit: String }], default: [] })
  ingredients: { name: string; amount: string; unit: string }[]; // 食材

  @Prop({ type: [{ order: Number, description: String, image: String }], default: [] })
  steps: { order: number; description: string; image?: string }[]; // 步骤

  @Prop()
  cookingTime: number; // 烹饪时间（分钟）

  @Prop({ enum: ['easy', 'medium', 'hard'], default: 'medium' })
  difficulty: string; // 难度

  @Prop({ type: [String], default: [] })
  photos: string[]; // 成品照片

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: [String], default: [] })
  tags: string[]; // 标签（川菜、素食、快手等）

  @Prop({ default: 0 })
  likes: number; // 点赞数

  @Prop({ default: 0 })
  cooks: number; // 烹饪次数
}

export const RecipeSchema = SchemaFactory.createForClass(Recipe);

