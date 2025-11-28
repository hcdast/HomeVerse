import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PasswordDocument = Password & Document;

@Schema({ timestamps: true })
export class Password {
  @Prop({ required: true })
  serviceName: string; // 服务名称

  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  encryptedPassword: string; // 加密后的密码

  @Prop()
  url: string;

  @Prop()
  notes: string;

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: [String], default: [] })
  sharedWith: string[]; // 共享给哪些成员

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  lastUsed: Date;
}

export const PasswordSchema = SchemaFactory.createForClass(Password);

