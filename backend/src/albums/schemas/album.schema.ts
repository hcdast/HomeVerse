import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AlbumDocument = Album & Document;

// 照片子文档
@Schema({ _id: true })
export class Photo {
  @Prop({ required: true })
  filename: string; // 存储文件名

  @Prop({ required: true })
  originalName: string; // 原始文件名

  @Prop({ required: true })
  path: string; // 存储路径

  @Prop({ required: true })
  size: number; // 文件大小（字节）

  @Prop({ type: Object })
  metadata: {
    width?: number;
    height?: number;
    format?: string;
    [key: string]: any;
  }; // 元数据

  @Prop({ default: Date.now })
  uploadedAt: Date; // 上传时间
}

const PhotoSchema = SchemaFactory.createForClass(Photo);

@Schema({ timestamps: true })
export class Album {
  @Prop({ required: true })
  title: string; // 相册标题

  @Prop()
  description: string; // 相册描述

  @Prop()
  coverImage: string; // 封面图片URL

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string; // 所属家庭ID

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string; // 创建者ID

  @Prop({ default: 'private', enum: ['public', 'private'] })
  privacy: string; // 公开/私有

  @Prop({ type: [String], default: [] })
  tags: string[]; // 标签

  @Prop({ type: [PhotoSchema], default: [] })
  photos: Photo[]; // 照片列表

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const AlbumSchema = SchemaFactory.createForClass(Album);

