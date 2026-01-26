import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BookDocument = Book & Document;

@Schema()
export class ReadingNote {
  @Prop({ type: String, ref: 'User', required: true })
  userId: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  page: number;

  @Prop()
  chapter: string;

  @Prop({ required: true })
  createdAt: Date;
}

@Schema({ timestamps: true })
export class Book {
  @Prop({ required: true })
  title: string;

  @Prop()
  author: string;

  @Prop()
  cover: string;

  @Prop()
  isbn: string;

  @Prop()
  publisher: string;

  @Prop()
  publishDate: Date;

  @Prop()
  category: string; // fiction, non-fiction, children, education, professional, other

  @Prop()
  language: string;

  @Prop()
  pages: number;

  @Prop()
  description: string;

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;

  @Prop()
  purchaseDate: Date;

  @Prop()
  price: number;

  @Prop()
  location: string; // 存放位置

  @Prop({ default: 'available' })
  status: string; // available, borrowed, reading, lost

  @Prop({ type: String, ref: 'User' })
  currentReader: string;

  @Prop()
  currentPage: number;

  @Prop()
  startReadingDate: Date;

  @Prop()
  finishReadingDate: Date;

  @Prop()
  rating: number; // 1-5

  @Prop()
  review: string;

  @Prop({ type: [ReadingNote], default: [] })
  notes: ReadingNote[];

  @Prop([String])
  tags: string[];

  @Prop({ default: false })
  isWishlist: boolean; // 是否是愿望清单
}

export const BookSchema = SchemaFactory.createForClass(Book);
BookSchema.index({ familyId: 1 });
BookSchema.index({ familyId: 1, category: 1 });
BookSchema.index({ familyId: 1, status: 1 });




