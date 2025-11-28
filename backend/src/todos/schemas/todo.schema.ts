import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TodoDocument = Todo & Document;

@Schema({ timestamps: true })
export class Todo {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ default: false })
  completed: boolean;

  @Prop()
  dueDate: Date;

  @Prop({ enum: ['low', 'medium', 'high'], default: 'medium' })
  priority: string;

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: String, ref: 'User' })
  assignedTo: string; // 分配给谁

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const TodoSchema = SchemaFactory.createForClass(Todo);

