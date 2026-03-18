import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AnnouncementDocument = Announcement & Document;

// 公告优先级
export enum AnnouncementPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

// 公告状态
export enum AnnouncementStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Schema({ timestamps: true })
export class Announcement {
  @Prop({ type: Types.ObjectId, ref: 'Family', required: true, index: true })
  familyId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ enum: AnnouncementPriority, default: AnnouncementPriority.NORMAL })
  priority: AnnouncementPriority;

  @Prop({ enum: AnnouncementStatus, default: AnnouncementStatus.PUBLISHED })
  status: AnnouncementStatus;

  @Prop({ default: false })
  isPinned: boolean; // 是否置顶

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  mentions: Types.ObjectId[]; // @提及的成员

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  readBy: Types.ObjectId[]; // 已读成员列表

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  confirmedBy: Types.ObjectId[]; // 已确认成员列表

  @Prop({ default: false })
  requireConfirmation: boolean; // 是否需要确认

  @Prop()
  expiresAt: Date; // 过期时间

  @Prop({ type: [String], default: [] })
  attachments: string[]; // 附件URL列表

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  icon: string; // 自定义图标

  @Prop({ type: Object })
  schedule: {
    publishAt?: Date;    // 定时发布时间
    unpublishAt?: Date;  // 定时下架时间
  };

  // 评论
  @Prop({
    type: [{
      _id: { type: Types.ObjectId, auto: true },
      userId: { type: Types.ObjectId, ref: 'User' },
      content: String,
      createdAt: { type: Date, default: Date.now },
    }],
    default: [],
  })
  comments: {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    content: string;
    createdAt: Date;
  }[];

  // 反应（表情回应）
  @Prop({
    type: [{
      emoji: String,
      users: [{ type: Types.ObjectId, ref: 'User' }],
    }],
    default: [],
  })
  reactions: {
    emoji: string;
    users: Types.ObjectId[];
  }[];
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);

// 索引
AnnouncementSchema.index({ familyId: 1, status: 1, isPinned: -1, createdAt: -1 });
AnnouncementSchema.index({ familyId: 1, mentions: 1 });
AnnouncementSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $exists: true } } });
