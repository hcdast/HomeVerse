import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AnniversaryDocument = Anniversary & Document;

export enum AnniversaryType {
  BIRTHDAY = 'birthday',         // 生日
  WEDDING = 'wedding',           // 结婚纪念日
  MEMORIAL = 'memorial',         // 忌日
  DATING = 'dating',             // 恋爱纪念日
  GRADUATION = 'graduation',     // 毕业纪念日
  WORK = 'work',                 // 入职纪念日
  CUSTOM = 'custom',             // 自定义
}

export enum LunarType {
  SOLAR = 'solar',   // 公历
  LUNAR = 'lunar',   // 农历
}

@Schema({ timestamps: true })
export class Anniversary {
  @Prop({ required: true })
  title: string; // 标题

  @Prop({ enum: AnniversaryType, default: AnniversaryType.CUSTOM })
  type: AnniversaryType; // 类型

  @Prop({ required: true })
  date: Date; // 日期（年份用于计算周年，月日用于每年提醒）

  @Prop({ enum: LunarType, default: LunarType.SOLAR })
  dateType: LunarType; // 日期类型

  @Prop({ type: String, ref: 'User' })
  relatedPerson: string; // 关联的人（可选）

  @Prop()
  relatedPersonName: string; // 关联人姓名（如果不在系统中）

  @Prop()
  description: string;

  @Prop({ type: [Number], default: [7, 3, 1, 0] })
  remindDaysBefore: number[]; // 提前多少天提醒

  @Prop({ default: true })
  enableReminder: boolean; // 是否启用提醒

  @Prop({ type: [String], default: [] })
  giftIdeas: string[]; // 礼物想法

  @Prop({ type: [String], default: [] })
  celebrationHistory: string[]; // 历年庆祝记录

  @Prop()
  icon: string; // 图标

  @Prop()
  color: string; // 颜色

  @Prop({ default: false })
  isPrivate: boolean; // 是否私密（仅创建者可见）

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const AnniversarySchema = SchemaFactory.createForClass(Anniversary);

// 索引
AnniversarySchema.index({ familyId: 1, date: 1 });
AnniversarySchema.index({ familyId: 1, type: 1 });

