import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WikiPageDocument = WikiPage & Document;

@Schema({ timestamps: true })
export class WikiPage {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string; // Markdown 内容

  @Prop()
  category: string; // 分类

  @Prop({ type: String, ref: 'WikiPage' })
  parentId: string; // 父页面ID（支持层级）

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: String, ref: 'User' })
  lastEditedBy: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: 0 })
  views: number;

  @Prop({ type: [{ version: Number, content: String, editedBy: String, editedAt: Date }], default: [] })
  versions: any[]; // 版本历史
}

export const WikiPageSchema = SchemaFactory.createForClass(WikiPage);

