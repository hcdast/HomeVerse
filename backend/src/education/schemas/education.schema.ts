import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EducationDocument = Education & Document;

@Schema()
export class Course {
  @Prop({ required: true })
  name: string;

  @Prop()
  teacher: string;

  @Prop()
  schedule: string;

  @Prop()
  location: string;

  @Prop()
  fee: number;

  @Prop()
  startDate: Date;

  @Prop()
  endDate: Date;

  @Prop()
  notes: string;

  @Prop({ default: 'active' })
  status: string;
}

@Schema()
export class Grade {
  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  score: number;

  @Prop()
  fullScore: number;

  @Prop()
  examType: string; // quiz, midterm, final, homework

  @Prop({ required: true })
  date: Date;

  @Prop()
  notes: string;
}

@Schema({ timestamps: true })
export class Education {
  @Prop({ required: true })
  studentName: string;

  @Prop()
  avatar: string;

  @Prop()
  school: string;

  @Prop()
  grade: string; // 年级

  @Prop()
  class: string; // 班级

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: String, ref: 'User' })
  linkedUserId: string; // 关联的用户

  @Prop({ type: [Course], default: [] })
  courses: Course[];

  @Prop({ type: [Grade], default: [] })
  grades: Grade[];

  @Prop()
  semester: string; // 当前学期

  @Prop()
  notes: string;

  @Prop([String])
  tags: string[];
}

export const EducationSchema = SchemaFactory.createForClass(Education);
EducationSchema.index({ familyId: 1 });




