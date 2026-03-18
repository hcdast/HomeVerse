import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Book, BookDocument, ReadingNote } from './schemas/book.schema';

@Injectable()
export class BooksService {
  constructor(@InjectModel(Book.name) private bookModel: Model<BookDocument>) {}

  async create(createDto: Partial<Book>): Promise<BookDocument> {
    return new this.bookModel(createDto).save();
  }

  async findByFamily(familyId: string, filters?: { category?: string; status?: string; isWishlist?: boolean }): Promise<BookDocument[]> {
    const query: any = { familyId };
    if (filters?.category) query.category = filters.category;
    if (filters?.status) query.status = filters.status;
    if (filters?.isWishlist !== undefined) query.isWishlist = filters.isWishlist;
    return this.bookModel.find(query)
      .populate('createdBy', 'username avatar')
      .populate('currentReader', 'username avatar')
      .sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<BookDocument> {
    const book = await this.bookModel.findById(id)
      .populate('createdBy', 'username avatar')
      .populate('currentReader', 'username avatar')
      .populate('notes.userId', 'username avatar').exec();
    if (!book) throw new NotFoundException('图书不存在');
    return book;
  }

  async update(id: string, updateDto: Partial<Book>): Promise<BookDocument> {
    const book = await this.bookModel.findByIdAndUpdate(id, updateDto, { new: true });
    if (!book) throw new NotFoundException('图书不存在');
    return book;
  }

  async delete(id: string): Promise<void> {
    const result = await this.bookModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('图书不存在');
  }

  async startReading(bookId: string, userId: string): Promise<BookDocument> {
    const book = await this.bookModel.findById(bookId);
    if (!book) throw new NotFoundException('图书不存在');
    book.status = 'reading';
    book.currentReader = userId;
    book.startReadingDate = new Date();
    book.currentPage = 0;
    return book.save();
  }

  async updateProgress(bookId: string, currentPage: number): Promise<BookDocument> {
    const book = await this.bookModel.findById(bookId);
    if (!book) throw new NotFoundException('图书不存在');
    book.currentPage = currentPage;
    if (book.pages && currentPage >= book.pages) {
      book.status = 'available';
      book.finishReadingDate = new Date();
    }
    return book.save();
  }

  async finishReading(bookId: string, rating?: number, review?: string): Promise<BookDocument> {
    const book = await this.bookModel.findById(bookId);
    if (!book) throw new NotFoundException('图书不存在');
    book.status = 'available';
    book.finishReadingDate = new Date();
    if (rating) book.rating = rating;
    if (review) book.review = review;
    book.currentReader = undefined;
    return book.save();
  }

  async addNote(bookId: string, userId: string, note: Partial<ReadingNote>): Promise<BookDocument> {
    const book = await this.bookModel.findById(bookId);
    if (!book) throw new NotFoundException('图书不存在');
    book.notes.push({ ...note, userId, createdAt: new Date() } as any);
    return book.save();
  }

  async getStatistics(familyId: string): Promise<any> {
    const books = await this.bookModel.find({ familyId, isWishlist: false }).exec();
    const byCategory: Record<string, number> = {};
    let totalValue = 0, readingCount = 0, ratedCount = 0, totalRating = 0;

    books.forEach(book => {
      if (book.category) byCategory[book.category] = (byCategory[book.category] || 0) + 1;
      if (book.price) totalValue += book.price;
      if (book.status === 'reading') readingCount++;
      if (book.rating) { ratedCount++; totalRating += book.rating; }
    });

    const wishlistCount = await this.bookModel.countDocuments({ familyId, isWishlist: true });

    return {
      totalBooks: books.length,
      wishlistCount,
      readingCount,
      totalValue,
      averageRating: ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : 0,
      byCategory: Object.entries(byCategory).map(([category, count]) => ({ category, count })),
    };
  }

  async getCurrentlyReading(familyId: string): Promise<BookDocument[]> {
    return this.bookModel.find({ familyId, status: 'reading' })
      .populate('currentReader', 'username avatar').exec();
  }
}






