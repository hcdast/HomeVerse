import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TimeCapsuleDocument = TimeCapsule & Document;

// 胶囊状态
export enum CapsuleStatus {
  SEALED = 'sealed',       // 已封存
  OPENED = 'opened',       // 已开启
  PENDING = 'pending',     // 等待开启
  DRAFT = 'draft',         // 草稿
}

// 内容类型
export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file',
}

// 胶囊内容项
@Schema({ _id: false })
class CapsuleContent {
  @Prop({ type: Types.ObjectId, auto: true })
  _id: Types.ObjectId;

  @Prop({ required: true, enum: ContentType })
  type: ContentType;

  @Prop()
  text: string;

  @Prop()
  fileUrl: string;

  @Prop()
  fileName: string;

  @Prop()
  thumbnail: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  addedBy: Types.ObjectId;

  @Prop()
  addedAt: Date;
}

const CapsuleContentSchema = SchemaFactory.createForClass(CapsuleContent);

// 贡献者
@Schema({ _id: false })
class Contributor {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ default: false })
  hasContributed: boolean;

  @Prop()
  contributedAt: Date;

  @Prop({ default: 0 })
  contentCount: number;
}

const ContributorSchema = SchemaFactory.createForClass(Contributor);

@Schema({ timestamps: true })
export class TimeCapsule {
  @Prop({ type: Types.ObjectId, ref: 'Family', required: true, index: true })
  familyId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true, enum: CapsuleStatus, default: CapsuleStatus.DRAFT })
  status: CapsuleStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ required: true })
  openDate: Date; // 开启日期

  @Prop()
  sealedAt: Date; // 封存时间

  @Prop()
  openedAt: Date; // 实际开启时间

  @Prop({ type: [CapsuleContentSchema], default: [] })
  contents: CapsuleContent[];

  @Prop({ type: [ContributorSchema], default: [] })
  contributors: Contributor[];

  @Prop()
  coverImage: string;

  @Prop()
  theme: string; // 主题样式

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false })
  isPublic: boolean; // 对家庭成员公开

  @Prop({ default: true })
  notifyOnOpen: boolean; // 开启时通知

  @Prop({ default: false })
  allowLateContributions: boolean; // 封存后是否允许添加内容

  @Prop({ type: Object })
  settings: {
    maxContentsPerUser?: number;
    requireApproval?: boolean;
    allowComments?: boolean;
  };

  @Prop({
    type: [{
      userId: { type: Types.ObjectId, ref: 'User' },
      emotion: String,
      comment: String,
      createdAt: Date,
    }],
    default: [],
  })
  reactions: {
    userId: Types.ObjectId;
    emotion: string;
    comment: string;
    createdAt: Date;
  }[];
}

export const TimeCapsuleSchema = SchemaFactory.createForClass(TimeCapsule);

// 索引
TimeCapsuleSchema.index({ familyId: 1, status: 1 });
TimeCapsuleSchema.index({ familyId: 1, openDate: 1 });
TimeCapsuleSchema.index({ openDate: 1, status: 1 }); // 用于查找待开启的胶囊
