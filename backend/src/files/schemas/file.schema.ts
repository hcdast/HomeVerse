import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FileDocument = File & Document;

@Schema({ timestamps: true })
export class File {
  @Prop({ required: true })
  filename: string; // 存储文件名

  @Prop({ required: true })
  originalName: string; // 原始文件名

  @Prop({ required: true })
  path: string; // 存储路径

  @Prop({ required: true })
  size: number; // 文件大小（字节）

  @Prop({ required: true })
  mimeType: string; // 文件类型（MIME类型）

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string; // 所属家庭ID

  @Prop({ type: String, ref: 'User', required: true })
  uploadedBy: string; // 上传者ID

  @Prop({ default: '/' })
  folder: string; // 文件夹路径

  @Prop({ type: [String], default: [] })
  tags: string[]; // 标签

  @Prop({ default: false })
  isPublic: boolean; // 是否公开

  @Prop({ default: 0 })
  downloads: number; // 下载次数

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const FileSchema = SchemaFactory.createForClass(File);

