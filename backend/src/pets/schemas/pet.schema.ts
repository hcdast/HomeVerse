import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PetDocument = Pet & Document;

// 宠物类型
export enum PetType {
  DOG = 'dog',
  CAT = 'cat',
  BIRD = 'bird',
  FISH = 'fish',
  HAMSTER = 'hamster',
  RABBIT = 'rabbit',
  TURTLE = 'turtle',
  OTHER = 'other',
}

// 健康记录
@Schema()
export class HealthRecord {
  @Prop({ required: true })
  type: string; // vaccination, checkup, treatment, weight

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  date: Date;

  @Prop()
  nextDate: Date; // 下次提醒日期

  @Prop()
  veterinarian: string;

  @Prop()
  hospital: string;

  @Prop()
  cost: number;

  @Prop()
  weight: number; // 体重记录

  @Prop([String])
  attachments: string[];
}

// 喂养记录
@Schema()
export class FeedingRecord {
  @Prop({ required: true })
  time: Date;

  @Prop({ required: true })
  foodType: string;

  @Prop()
  amount: string;

  @Prop()
  notes: string;

  @Prop({ type: String, ref: 'User' })
  fedBy: string;
}

@Schema({ timestamps: true })
export class Pet {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: PetType })
  type: PetType;

  @Prop()
  breed: string; // 品种

  @Prop()
  avatar: string;

  @Prop([String])
  photos: string[];

  @Prop()
  gender: string; // male, female, unknown

  @Prop()
  birthday: Date;

  @Prop()
  adoptionDate: Date; // 领养日期

  @Prop()
  color: string;

  @Prop()
  weight: number; // 当前体重 kg

  @Prop()
  microchipId: string; // 芯片号

  @Prop()
  description: string;

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: [{ type: String, ref: 'User' }] })
  caregivers: string[]; // 照顾者

  @Prop({ type: [HealthRecord], default: [] })
  healthRecords: HealthRecord[];

  @Prop({ type: [FeedingRecord], default: [] })
  feedingRecords: FeedingRecord[];

  @Prop()
  feedingSchedule: string; // 喂养时间表描述

  @Prop([String])
  allergies: string[]; // 过敏源

  @Prop([String])
  medications: string[]; // 正在服用的药物

  @Prop()
  veterinarianContact: string; // 兽医联系方式

  @Prop({ default: true })
  isActive: boolean;

  @Prop([String])
  tags: string[];
}

export const PetSchema = SchemaFactory.createForClass(Pet);
PetSchema.index({ familyId: 1 });
PetSchema.index({ familyId: 1, type: 1 });




