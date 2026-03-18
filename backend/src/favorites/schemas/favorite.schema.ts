import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FavoriteDocument = Favorite & Document;
export type FavoriteCollectionDocument = FavoriteCollection & Document;

// 收藏内容类型
export enum FavoriteType {
  ARTICLE = 'article',
  RECIPE = 'recipe',
  FILE = 'file',
  ALBUM = 'album',
  WIKI = 'wiki',
  LINK = 'link',
  NOTE = 'note',
}

// 收藏项
@Schema({ timestamps: true })
export class Favorite {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Family', required: true, index: true })
  familyId: Types.ObjectId;

  @Prop({ required: true, enum: FavoriteType })
  type: FavoriteType;

  @Prop({ type: Types.ObjectId, required: true })
  itemId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop()
  thumbnail: string;

  @Prop()
  url: string; // 外部链接

  @Prop({ type: [{ type: Types.ObjectId, ref: 'FavoriteCollection' }], default: [] })
  collections: Types.ObjectId[]; // 所属收藏夹

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  notes: string; // 用户备注

  @Prop({ default: false })
  isPinned: boolean;

  @Prop({ type: Object })
  metadata: Record<string, any>; // 额外元数据
}

export const FavoriteSchema = SchemaFactory.createForClass(Favorite);

// 索引
FavoriteSchema.index({ userId: 1, type: 1 });
FavoriteSchema.index({ userId: 1, itemId: 1, type: 1 }, { unique: true });
FavoriteSchema.index({ userId: 1, isPinned: -1, createdAt: -1 });

// 收藏夹/文件夹
@Schema({ timestamps: true })
export class FavoriteCollection {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Family', required: true, index: true })
  familyId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop()
  icon: string;

  @Prop()
  color: string;

  @Prop({ default: false })
  isPrivate: boolean;

  @Prop({ default: false })
  isDefault: boolean; // 是否为默认收藏夹

  @Prop({ default: 0 })
  itemCount: number;

  @Prop({ type: Types.ObjectId, ref: 'FavoriteCollection' })
  parentId: Types.ObjectId; // 父收藏夹，支持嵌套

  @Prop({ default: 0 })
  sortOrder: number;
}

export const FavoriteCollectionSchema = SchemaFactory.createForClass(FavoriteCollection);

// 索引
FavoriteCollectionSchema.index({ userId: 1, sortOrder: 1 });
FavoriteCollectionSchema.index({ userId: 1, parentId: 1 });
