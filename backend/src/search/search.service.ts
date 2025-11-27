import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Article, ArticleDocument } from '../articles/schemas/article.schema';
import { File, FileDocument } from '../files/schemas/file.schema';
import { Album, AlbumDocument } from '../albums/schemas/album.schema';

export interface SearchResult {
  type: 'article' | 'file' | 'album' | 'photo';
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  createdAt: Date;
  author?: any;
  metadata?: any;
}

export interface SearchOptions {
  keyword: string;
  type?: 'all' | 'article' | 'file' | 'album';
  familyId: string;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  page?: number;
  limit?: number;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Article.name) private articleModel: Model<ArticleDocument>,
    @InjectModel(File.name) private fileModel: Model<FileDocument>,
    @InjectModel(Album.name) private albumModel: Model<AlbumDocument>,
  ) {}

  // 全局搜索
  async search(options: SearchOptions): Promise<{
    results: SearchResult[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { keyword, type = 'all', familyId, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    let results: SearchResult[] = [];
    let total = 0;

    if (type === 'all' || type === 'article') {
      const articles = await this.searchArticles(keyword, familyId, type === 'all' ? Math.ceil(limit / 3) : limit, skip);
      results.push(...articles);
      if (type === 'article') {
        total = await this.countArticles(keyword, familyId);
      }
    }

    if (type === 'all' || type === 'file') {
      const files = await this.searchFiles(keyword, familyId, type === 'all' ? Math.ceil(limit / 3) : limit, skip);
      results.push(...files);
      if (type === 'file') {
        total = await this.countFiles(keyword, familyId);
      }
    }

    if (type === 'all' || type === 'album') {
      const albums = await this.searchAlbums(keyword, familyId, type === 'all' ? Math.ceil(limit / 3) : limit, skip);
      results.push(...albums);
      if (type === 'album') {
        total = await this.countAlbums(keyword, familyId);
      }
    }

    // 如果是全局搜索，按时间排序
    if (type === 'all') {
      results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      results = results.slice(0, limit);
      total = results.length;
    }

    return {
      results,
      total,
      page,
      limit,
    };
  }

  // 高级搜索
  async advancedSearch(options: SearchOptions): Promise<{
    results: SearchResult[];
    total: number;
  }> {
    const { keyword, type = 'all', familyId, startDate, endDate, tags, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const baseFilter: any = {
      familyId: new Types.ObjectId(familyId),
    };

    // 时间筛选
    if (startDate || endDate) {
      baseFilter.createdAt = {};
      if (startDate) baseFilter.createdAt.$gte = startDate;
      if (endDate) baseFilter.createdAt.$lte = endDate;
    }

    // 标签筛选
    if (tags && tags.length > 0) {
      baseFilter.tags = { $in: tags };
    }

    let results: SearchResult[] = [];
    let total = 0;

    if (type === 'all' || type === 'article') {
      const articleFilter = {
        ...baseFilter,
        $or: [
          { title: { $regex: keyword, $options: 'i' } },
          { content: { $regex: keyword, $options: 'i' } },
          { excerpt: { $regex: keyword, $options: 'i' } },
        ],
      };

      const [articles, count] = await Promise.all([
        this.articleModel
          .find(articleFilter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('author', 'username avatar')
          .select('title excerpt coverImage createdAt author tags')
          .exec(),
        this.articleModel.countDocuments(articleFilter),
      ]);

      results.push(
        ...articles.map(article => ({
          type: 'article' as const,
          id: article._id.toString(),
          title: article.title,
          description: article.excerpt,
          thumbnail: article.coverImage,
          createdAt: article.createdAt,
          author: article.author,
          metadata: { tags: article.tags },
        })),
      );

      if (type === 'article') total = count;
    }

    if (type === 'all' || type === 'file') {
      const fileFilter = {
        ...baseFilter,
        $or: [
          { originalName: { $regex: keyword, $options: 'i' } },
          { tags: { $regex: keyword, $options: 'i' } },
        ],
      };

      const [files, count] = await Promise.all([
        this.fileModel
          .find(fileFilter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('uploadedBy', 'username avatar')
          .exec(),
        this.fileModel.countDocuments(fileFilter),
      ]);

      results.push(
        ...files.map(file => ({
          type: 'file' as const,
          id: file._id.toString(),
          title: file.originalName,
          description: `文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB`,
          createdAt: file.createdAt,
          author: file.uploadedBy,
          metadata: { mimeType: file.mimeType, size: file.size, tags: file.tags },
        })),
      );

      if (type === 'file') total = count;
    }

    if (type === 'all' || type === 'album') {
      const albumFilter = {
        ...baseFilter,
        $or: [
          { title: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } },
        ],
      };

      const [albums, count] = await Promise.all([
        this.albumModel
          .find(albumFilter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('createdBy', 'username avatar')
          .exec(),
        this.albumModel.countDocuments(albumFilter),
      ]);

      results.push(
        ...albums.map(album => ({
          type: 'album' as const,
          id: album._id.toString(),
          title: album.title,
          description: album.description,
          thumbnail: album.coverImage,
          createdAt: album.createdAt,
          author: album.createdBy,
          metadata: { photoCount: album.photos?.length || 0, tags: album.tags },
        })),
      );

      if (type === 'album') total = count;
    }

    // 全局搜索时按时间排序
    if (type === 'all') {
      results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      total = results.length;
    }

    return { results, total };
  }

  // 搜索文章
  private async searchArticles(keyword: string, familyId: string, limit: number, skip: number): Promise<SearchResult[]> {
    const articles = await this.articleModel
      .find({
        familyId: new Types.ObjectId(familyId),
        $or: [
          { title: { $regex: keyword, $options: 'i' } },
          { content: { $regex: keyword, $options: 'i' } },
          { excerpt: { $regex: keyword, $options: 'i' } },
        ],
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username avatar')
      .select('title excerpt coverImage createdAt author')
      .exec();

    return articles.map(article => ({
      type: 'article',
      id: article._id.toString(),
      title: article.title,
      description: article.excerpt,
      thumbnail: article.coverImage,
      createdAt: article.createdAt,
      author: article.author,
    }));
  }

  // 搜索文件
  private async searchFiles(keyword: string, familyId: string, limit: number, skip: number): Promise<SearchResult[]> {
    const files = await this.fileModel
      .find({
        familyId: new Types.ObjectId(familyId),
        originalName: { $regex: keyword, $options: 'i' },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('uploadedBy', 'username avatar')
      .exec();

    return files.map(file => ({
      type: 'file',
      id: file._id.toString(),
      title: file.originalName,
      description: `文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB`,
      createdAt: file.createdAt,
      author: file.uploadedBy,
      metadata: { mimeType: file.mimeType },
    }));
  }

  // 搜索相册
  private async searchAlbums(keyword: string, familyId: string, limit: number, skip: number): Promise<SearchResult[]> {
    const albums = await this.albumModel
      .find({
        familyId: new Types.ObjectId(familyId),
        $or: [
          { title: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } },
        ],
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'username avatar')
      .exec();

    return albums.map(album => ({
      type: 'album',
      id: album._id.toString(),
      title: album.title,
      description: album.description,
      thumbnail: album.coverImage,
      createdAt: album.createdAt,
      author: album.createdBy,
      metadata: { photoCount: album.photos?.length || 0 },
    }));
  }

  // 统计数量
  private async countArticles(keyword: string, familyId: string): Promise<number> {
    return this.articleModel.countDocuments({
      familyId: new Types.ObjectId(familyId),
      $or: [
        { title: { $regex: keyword, $options: 'i' } },
        { content: { $regex: keyword, $options: 'i' } },
      ],
    });
  }

  private async countFiles(keyword: string, familyId: string): Promise<number> {
    return this.fileModel.countDocuments({
      familyId: new Types.ObjectId(familyId),
      originalName: { $regex: keyword, $options: 'i' },
    });
  }

  private async countAlbums(keyword: string, familyId: string): Promise<number> {
    return this.albumModel.countDocuments({
      familyId: new Types.ObjectId(familyId),
      $or: [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
      ],
    });
  }

  // 获取热门标签
  async getPopularTags(familyId: string, limit: number = 10): Promise<{ tag: string; count: number }[]> {
    const articles = await this.articleModel.find({ familyId: new Types.ObjectId(familyId) }).select('tags').exec();
    const files = await this.fileModel.find({ familyId: new Types.ObjectId(familyId) }).select('tags').exec();
    const albums = await this.albumModel.find({ familyId: new Types.ObjectId(familyId) }).select('tags').exec();

    const tagCounts = new Map<string, number>();

    // 统计标签
    [...articles, ...files, ...albums].forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          if (tag) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          }
        });
      }
    });

    // 转换为数组并排序
    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

