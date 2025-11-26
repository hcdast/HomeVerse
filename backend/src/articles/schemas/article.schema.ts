import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ArticleDocument = Article & Document;

// 评论回复子文档
@Schema({ _id: true })
export class CommentReply {
  @Prop({ type: String, ref: 'User', required: true })
  user: string; // 回复用户ID

  @Prop({ required: true })
  content: string; // 回复内容

  @Prop({ default: Date.now })
  createdAt: Date; // 创建时间
}

const CommentReplySchema = SchemaFactory.createForClass(CommentReply);

// 评论子文档
@Schema({ _id: true })
export class Comment {
  @Prop({ type: String, ref: 'User', required: true })
  user: string; // 评论用户ID

  @Prop({ required: true })
  content: string; // 评论内容

  @Prop({ type: [CommentReplySchema], default: [] })
  replies: CommentReply[]; // 回复列表

  @Prop({ default: Date.now })
  createdAt: Date; // 创建时间
}

const CommentSchema = SchemaFactory.createForClass(Comment);

@Schema({ timestamps: true })
export class Article {
  @Prop({ required: true })
  title: string; // 文章标题

  @Prop({ required: true })
  content: string; // 文章内容

  @Prop()
  excerpt: string; // 摘要

  @Prop()
  coverImage: string; // 封面图片URL

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string; // 所属家庭ID

  @Prop({ type: String, ref: 'User', required: true })
  author: string; // 作者ID

  @Prop()
  category: string; // 分类

  @Prop({ type: [String], default: [] })
  tags: string[]; // 标签

  @Prop({ default: 'draft', enum: ['draft', 'published'] })
  status: string; // 状态: draft/published

  @Prop({ default: 'private', enum: ['public', 'private'] })
  privacy: string; // 隐私设置

  @Prop({ default: 0 })
  views: number; // 阅读量

  @Prop({ type: [String], ref: 'User', default: [] })
  likes: string[]; // 点赞用户ID列表

  @Prop({ type: [CommentSchema], default: [] })
  comments: Comment[]; // 评论列表

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ArticleSchema = SchemaFactory.createForClass(Article);

