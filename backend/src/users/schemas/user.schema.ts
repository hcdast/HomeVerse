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

  @Prop({ 
    default: 'member', 
    enum: ['owner', 'admin', 'editor', 'viewer', 'member'] 
  })
  role: string; // 角色: owner(所有者)/admin(管理员)/editor(编辑者)/viewer(访客)/member(成员)
  
  @Prop({ type: Object, default: {} })
  permissions: {
    albums?: { read: boolean; write: boolean; delete: boolean };
    files?: { read: boolean; write: boolean; delete: boolean };
    articles?: { read: boolean; write: boolean; delete: boolean };
    members?: { read: boolean; write: boolean; delete: boolean };
  }; // 自定义权限

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

