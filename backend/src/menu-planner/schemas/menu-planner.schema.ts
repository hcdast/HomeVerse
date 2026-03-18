import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MenuPlanDocument = MenuPlan & Document;
export type MealPlanDocument = MealPlan & Document;

// 餐次类型
export enum MealType {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
  SNACK = 'snack',
}

// 单餐计划
@Schema({ _id: false })
class MealItem {
  @Prop({ type: Types.ObjectId, ref: 'Recipe' })
  recipeId: Types.ObjectId;

  @Prop()
  recipeName: string;

  @Prop()
  note: string;

  @Prop({ default: false })
  isCooked: boolean;

  @Prop()
  cookedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  cookedBy: Types.ObjectId;
}

const MealItemSchema = SchemaFactory.createForClass(MealItem);

// 每日餐单
@Schema({ timestamps: true })
export class MealPlan {
  @Prop({ type: Types.ObjectId, ref: 'Family', required: true, index: true })
  familyId: Types.ObjectId;

  @Prop({ required: true, index: true })
  date: Date;

  @Prop({ type: [MealItemSchema], default: [] })
  breakfast: MealItem[];

  @Prop({ type: [MealItemSchema], default: [] })
  lunch: MealItem[];

  @Prop({ type: [MealItemSchema], default: [] })
  dinner: MealItem[];

  @Prop({ type: [MealItemSchema], default: [] })
  snack: MealItem[];

  @Prop()
  notes: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;
}

export const MealPlanSchema = SchemaFactory.createForClass(MealPlan);
MealPlanSchema.index({ familyId: 1, date: 1 }, { unique: true });

// 周菜单计划
@Schema({ timestamps: true })
export class MenuPlan {
  @Prop({ type: Types.ObjectId, ref: 'Family', required: true, index: true })
  familyId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ default: 'draft', enum: ['draft', 'active', 'completed', 'archived'] })
  status: string;

  @Prop({ type: Object, default: {} })
  preferences: {
    excludeIngredients?: string[];  // 排除的食材
    dietaryRestrictions?: string[]; // 饮食限制
    budget?: number;                // 预算
    servings?: number;              // 人数
  };

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ default: false })
  isAiGenerated: boolean;

  @Prop()
  aiPrompt: string;
}

export const MenuPlanSchema = SchemaFactory.createForClass(MenuPlan);

// 购物清单自动生成记录
@Schema({ timestamps: true })
export class ShoppingListGeneration {
  @Prop({ type: Types.ObjectId, ref: 'Family', required: true })
  familyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'MenuPlan', required: true })
  menuPlanId: Types.ObjectId;

  @Prop({ type: [{ name: String, amount: String, unit: String, category: String }], default: [] })
  ingredients: {
    name: string;
    amount: string;
    unit: string;
    category: string;
  }[];

  @Prop({ default: false })
  isAddedToShoppingList: boolean;

  @Prop()
  addedAt: Date;
}

export type ShoppingListGenerationDocument = ShoppingListGeneration & Document;
export const ShoppingListGenerationSchema = SchemaFactory.createForClass(ShoppingListGeneration);
