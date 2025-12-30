import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AiTaskDocument = AiTask & Document;

@Schema({ timestamps: true })
export class AiTask {
  @Prop({ required: true })
  taskId: string; // 任务唯一ID

  @Prop()
  remoteTaskId: string; // 远程任务ID（Wavespeed 返回的 request_id）

  @Prop({ required: true })
  userId: string; // 创建者ID

  @Prop({ required: true })
  familyId: string; // 家庭ID

  @Prop({ required: true, enum: ['chat_agent', 'text_to_image', 'image_to_image', 'text_to_video', 'image_to_video'] })
  toolType: string; // 工具类型

  @Prop({ required: true, enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'] })
  status: string; // 任务状态

  @Prop({ type: Object })
  params: {
    prompt?: string;
    model?: string;
    imageUrl?: string;
    videoUrl?: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    duration?: number;
    [key: string]: any;
  }; // 任务参数

  @Prop({ type: Object })
  result: {
    imageUrl?: string;
    imageUrls?: string[];
    videoUrl?: string;
    thumbnailUrl?: string;
    text?: string;
    conversationId?: string;
    [key: string]: any;
  }; // 任务结果

  @Prop({ type: Number, default: 0 })
  progress: number; // 进度 (0-100)

  @Prop()
  errorMessage: string; // 错误信息

  @Prop({ type: Object })
  metadata: {
    provider?: string;
    model?: string;
    duration?: number;
    cost?: number;
    [key: string]: any;
  }; // 元数据

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;

  @Prop()
  completedAt: Date; // 完成时间
}

export const AiTaskSchema = SchemaFactory.createForClass(AiTask);

// 创建索引
AiTaskSchema.index({ taskId: 1 }, { unique: true });
AiTaskSchema.index({ userId: 1, createdAt: -1 });
AiTaskSchema.index({ familyId: 1, createdAt: -1 });
AiTaskSchema.index({ status: 1 });

