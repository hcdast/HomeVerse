import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ActivityAction {
  // 用户相关
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_REGISTER = 'user_register',
  USER_UPDATE_PROFILE = 'user_update_profile',
  
  // 家庭相关
  FAMILY_CREATE = 'family_create',
  FAMILY_UPDATE = 'family_update',
  MEMBER_INVITE = 'member_invite',
  MEMBER_JOIN = 'member_join',
  MEMBER_LEAVE = 'member_leave',
  MEMBER_REMOVE = 'member_remove',
  MEMBER_ROLE_CHANGE = 'member_role_change',
  MEMBER_PERMISSION_CHANGE = 'member_permission_change',
  OWNERSHIP_TRANSFER = 'ownership_transfer',
  
  // 文章相关
  ARTICLE_CREATE = 'article_create',
  ARTICLE_UPDATE = 'article_update',
  ARTICLE_DELETE = 'article_delete',
  ARTICLE_PUBLISH = 'article_publish',
  ARTICLE_LIKE = 'article_like',
  ARTICLE_COMMENT = 'article_comment',
  
  // 相册相关
  ALBUM_CREATE = 'album_create',
  ALBUM_UPDATE = 'album_update',
  ALBUM_DELETE = 'album_delete',
  PHOTO_UPLOAD = 'photo_upload',
  PHOTO_DELETE = 'photo_delete',
  
  // 文件相关
  FILE_UPLOAD = 'file_upload',
  FILE_DOWNLOAD = 'file_download',
  FILE_DELETE = 'file_delete',
  FILE_MOVE = 'file_move',
  FOLDER_CREATE = 'folder_create',
  FOLDER_DELETE = 'folder_delete',
}

export enum ActivityLevel {
  INFO = 'info',       // 信息
  WARNING = 'warning', // 警告
  ERROR = 'error',     // 错误
  SUCCESS = 'success', // 成功
}

export type ActivityLogDocument = ActivityLog & Document;

@Schema({ timestamps: true })
export class ActivityLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId; // 操作用户

  @Prop({ type: Types.ObjectId, ref: 'Family' })
  familyId: Types.ObjectId; // 所属家庭

  @Prop({ required: true, enum: ActivityAction })
  action: ActivityAction; // 操作类型

  @Prop({ required: true })
  description: string; // 操作描述

  @Prop({ default: ActivityLevel.INFO, enum: ActivityLevel })
  level: ActivityLevel; // 日志级别

  @Prop({ type: Object })
  metadata: {
    targetId?: string;       // 目标对象ID
    targetType?: string;     // 目标类型（article/file/album等）
    targetName?: string;     // 目标名称
    oldValue?: any;          // 旧值
    newValue?: any;          // 新值
    ipAddress?: string;      // IP地址
    userAgent?: string;      // 浏览器信息
    [key: string]: any;
  };

  @Prop()
  ipAddress: string; // IP地址

  @Prop()
  userAgent: string; // 用户代理
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

// 创建索引
ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ familyId: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1, createdAt: -1 });
ActivityLogSchema.index({ createdAt: -1 });

