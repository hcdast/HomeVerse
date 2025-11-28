import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HealthRecordDocument = HealthRecord & Document;

@Schema({ timestamps: true })
export class HealthRecord {
  @Prop({ type: String, ref: 'User', required: true })
  userId: string; // 记录对象

  @Prop({ required: true, enum: ['checkup', 'medication', 'illness', 'vaccination', 'metric'] })
  type: string; // 记录类型

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ type: Object })
  data: any; // 具体数据（身高、体重、血压等）

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: [String], default: [] })
  attachments: string[]; // 报告、处方照片
}

export const HealthRecordSchema = SchemaFactory.createForClass(HealthRecord);

