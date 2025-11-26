import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  username: string; // 用户名

  @Prop({ required: true, unique: true })
  email: string; // 邮箱

  @Prop({ required: true })
  password: string; // 加密密码

  @Prop()
  avatar: string; // 头像URL

  @Prop({ type: String, ref: 'Family' })
  familyId: string; // 所属家庭ID

  @Prop({ default: 'member', enum: ['admin', 'member'] })
  role: string; // 角色: admin/member

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

