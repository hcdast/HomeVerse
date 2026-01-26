import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MomentDocument = Moment & Document;

export enum MomentType {
  POST = 'post',             // 普通动态
  ANNOUNCEMENT = 'announcement', // 家庭公告
  MILESTONE = 'milestone',   // 里程碑
  PHOTO = 'photo',           // 照片分享
  VIDEO = 'video',           // 视频分享
}

@Schema({ timestamps: true })
export class Reaction {
  @Prop({ type: String, ref: 'User', required: true })
  userId: string;

  @Prop({ required: true })
  emoji: string; // 👍 ❤️ 😄 🎉 😢 😮
}

@Schema({ timestamps: true })
export class Comment {
  @Prop({ type: String, ref: 'User', required: true })
  userId: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [{ type: String, ref: 'User' }], default: [] })
  likes: string[];

  @Prop()
  createdAt: Date;
}

@Schema({ timestamps: true })
export class Moment {
  @Prop({ enum: MomentType, default: MomentType.POST })
  type: MomentType; // 动态类型

  @Prop({ required: true })
  content: string; // 内容

  @Prop({ type: [String], default: [] })
  images: string[]; // 图片列表

  @Prop({ type: [String], default: [] })
  videos: string[]; // 视频列表

  @Prop({ type: String, ref: 'User', required: true })
  author: string; // 发布者

  @Prop({ type: [{ type: String, ref: 'User' }], default: [] })
  mentions: string[]; // @提及的人

  @Prop({ type: [Reaction], default: [] })
  reactions: Reaction[]; // 表情回复

  @Prop({ type: [Comment], default: [] })
  comments: Comment[]; // 评论

  @Prop({ default: false })
  isPinned: boolean; // 是否置顶

  @Prop({ default: true })
  isVisible: boolean; // 是否可见

  @Prop()
  location: string; // 位置

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: 0 })
  viewCount: number; // 浏览次数
}

export const MomentSchema = SchemaFactory.createForClass(Moment);

// 索引
MomentSchema.index({ familyId: 1, createdAt: -1 });
MomentSchema.index({ familyId: 1, isPinned: -1, createdAt: -1 });
MomentSchema.index({ familyId: 1, type: 1 });

