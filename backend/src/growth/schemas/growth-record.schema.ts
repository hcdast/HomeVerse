import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GrowthRecordDocument = GrowthRecord & Document;

@Schema({ timestamps: true })
export class GrowthRecord {
  @Prop({ type: String, ref: 'User', required: true })
  childId: string; // 孩子的用户ID

  @Prop({ required: true })
  date: Date;

  @Prop()
  height: number; // 身高（cm）

  @Prop()
  weight: number; // 体重（kg）

  @Prop()
  milestone: string; // 里程碑事件

  @Prop({ type: [String], default: [] })
  photos: string[];

  @Prop()
  notes: string;

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;
}

export const GrowthRecordSchema = SchemaFactory.createForClass(GrowthRecord);

