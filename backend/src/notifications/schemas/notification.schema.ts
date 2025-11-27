import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum NotificationType {
  MEMBER_INVITED = 'member_invited',       // 成员邀请
  MEMBER_JOINED = 'member_joined',         // 成员加入
  MEMBER_LEFT = 'member_left',             // 成员离开
  ROLE_CHANGED = 'role_changed',           // 角色变更
  ARTICLE_COMMENTED = 'article_commented', // 文章评论
  ARTICLE_LIKED = 'article_liked',         // 文章点赞
  FILE_SHARED = 'file_shared',             // 文件分享
  ALBUM_SHARED = 'album_shared',           // 相册分享
  PERMISSION_CHANGED = 'permission_changed', // 权限变更
  SYSTEM_ANNOUNCEMENT = 'system_announcement', // 系统公告
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived',
}

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipient: Types.ObjectId; // 接收者

  @Prop({ type: Types.ObjectId, ref: 'User' })
  sender: Types.ObjectId; // 发送者（可选）

  @Prop({ type: Types.ObjectId, ref: 'Family' })
  familyId: Types.ObjectId; // 所属家庭

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType; // 通知类型

  @Prop({ required: true })
  title: string; // 通知标题

  @Prop({ required: true })
  content: string; // 通知内容

  @Prop({ type: Object })
  metadata: {
    articleId?: string;
    commentId?: string;
    fileId?: string;
    albumId?: string;
    memberId?: string;
    [key: string]: any;
  }; // 额外数据

  @Prop({ default: NotificationStatus.UNREAD, enum: NotificationStatus })
  status: NotificationStatus; // 通知状态

  @Prop()
  readAt: Date; // 阅读时间

  @Prop()
  link: string; // 跳转链接
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// 创建索引
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, status: 1 });
NotificationSchema.index({ familyId: 1, createdAt: -1 });

