import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Favorite,
  FavoriteDocument,
  FavoriteCollection,
  FavoriteCollectionDocument,
  FavoriteType,
} from './schemas/favorite.schema';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(
    @InjectModel(Favorite.name) private favoriteModel: Model<FavoriteDocument>,
    @InjectModel(FavoriteCollection.name) private collectionModel: Model<FavoriteCollectionDocument>,
  ) {}

  // ============= 收藏项 =============

  // 添加收藏
  async addFavorite(
    userId: string,
    familyId: string,
    data: {
      type: FavoriteType;
      itemId: string;
      title: string;
      description?: string;
      thumbnail?: string;
      url?: string;
      tags?: string[];
      notes?: string;
      collectionId?: string;
    },
  ): Promise<FavoriteDocument> {
    const userObjId = new Types.ObjectId(userId);
    const itemObjId = new Types.ObjectId(data.itemId);

    // 检查是否已收藏
    const existing = await this.favoriteModel.findOne({
      userId: userObjId,
      itemId: itemObjId,
      type: data.type,
    });

    if (existing) {
      throw new BadRequestException('已经收藏过该内容');
    }

    const favorite = new this.favoriteModel({
      ...data,
      userId: userObjId,
      familyId: new Types.ObjectId(familyId),
      itemId: itemObjId,
      collections: data.collectionId ? [new Types.ObjectId(data.collectionId)] : [],
    });

    const saved = await favorite.save();

    // 更新收藏夹计数
    if (data.collectionId) {
      await this.updateCollectionCount(data.collectionId);
    }

    return saved;
  }

  // 取消收藏
  async removeFavorite(userId: string, itemId: string, type: FavoriteType): Promise<void> {
    const favorite = await this.favoriteModel.findOne({
      userId: new Types.ObjectId(userId),
      itemId: new Types.ObjectId(itemId),
      type,
    });

    if (!favorite) {
      throw new NotFoundException('收藏不存在');
    }

    // 更新所有相关收藏夹计数
    for (const collectionId of favorite.collections) {
      await this.updateCollectionCount(collectionId.toString());
    }

    await this.favoriteModel.findByIdAndDelete(favorite._id);
  }

  // 获取用户收藏列表
  async getFavorites(
    userId: string,
    options: {
      type?: FavoriteType;
      collectionId?: string;
      page?: number;
      limit?: number;
      search?: string;
    } = {},
  ): Promise<{ favorites: FavoriteDocument[]; total: number }> {
    const { type, collectionId, page = 1, limit = 20, search } = options;
    const skip = (page - 1) * limit;

    const filter: any = { userId: new Types.ObjectId(userId) };
    if (type) filter.type = type;
    if (collectionId) filter.collections = new Types.ObjectId(collectionId);
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    const [favorites, total] = await Promise.all([
      this.favoriteModel
        .find(filter)
        .populate('collections', 'name icon color')
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.favoriteModel.countDocuments(filter),
    ]);

    return { favorites, total };
  }

  // 检查是否已收藏
  async isFavorited(userId: string, itemId: string, type: FavoriteType): Promise<boolean> {
    const count = await this.favoriteModel.countDocuments({
      userId: new Types.ObjectId(userId),
      itemId: new Types.ObjectId(itemId),
      type,
    });
    return count > 0;
  }

  // 批量检查收藏状态
  async checkFavoriteStatus(
    userId: string,
    items: { itemId: string; type: FavoriteType }[],
  ): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};

    const favorites = await this.favoriteModel.find({
      userId: new Types.ObjectId(userId),
      $or: items.map((item) => ({
        itemId: new Types.ObjectId(item.itemId),
        type: item.type,
      })),
    });

    for (const item of items) {
      const key = `${item.type}:${item.itemId}`;
      result[key] = favorites.some(
        (f) => f.itemId.toString() === item.itemId && f.type === item.type,
      );
    }

    return result;
  }

  // 更新收藏备注
  async updateFavoriteNotes(favoriteId: string, notes: string): Promise<FavoriteDocument> {
    const favorite = await this.favoriteModel.findByIdAndUpdate(
      favoriteId,
      { notes },
      { new: true },
    );
    if (!favorite) {
      throw new NotFoundException('收藏不存在');
    }
    return favorite;
  }

  // 切换置顶状态
  async togglePin(favoriteId: string): Promise<FavoriteDocument> {
    const favorite = await this.favoriteModel.findById(favoriteId);
    if (!favorite) {
      throw new NotFoundException('收藏不存在');
    }

    favorite.isPinned = !favorite.isPinned;
    return favorite.save();
  }

  // 移动到收藏夹
  async moveToCollection(
    favoriteId: string,
    collectionIds: string[],
  ): Promise<FavoriteDocument> {
    const favorite = await this.favoriteModel.findById(favoriteId);
    if (!favorite) {
      throw new NotFoundException('收藏不存在');
    }

    // 更新旧收藏夹计数
    for (const oldCollId of favorite.collections) {
      await this.updateCollectionCount(oldCollId.toString());
    }

    // 更新收藏夹
    favorite.collections = collectionIds.map((id) => new Types.ObjectId(id));
    await favorite.save();

    // 更新新收藏夹计数
    for (const newCollId of collectionIds) {
      await this.updateCollectionCount(newCollId);
    }

    return favorite;
  }

  // ============= 收藏夹 =============

  // 创建收藏夹
  async createCollection(
    userId: string,
    familyId: string,
    data: {
      name: string;
      description?: string;
      icon?: string;
      color?: string;
      isPrivate?: boolean;
      parentId?: string;
    },
  ): Promise<FavoriteCollectionDocument> {
    const collection = new this.collectionModel({
      ...data,
      userId: new Types.ObjectId(userId),
      familyId: new Types.ObjectId(familyId),
      parentId: data.parentId ? new Types.ObjectId(data.parentId) : undefined,
    });

    return collection.save();
  }

  // 获取收藏夹列表
  async getCollections(
    userId: string,
    parentId?: string,
  ): Promise<FavoriteCollectionDocument[]> {
    const filter: any = { userId: new Types.ObjectId(userId) };
    if (parentId) {
      filter.parentId = new Types.ObjectId(parentId);
    } else {
      filter.parentId = { $exists: false };
    }

    return this.collectionModel.find(filter).sort({ sortOrder: 1, createdAt: -1 }).exec();
  }

  // 获取收藏夹详情
  async getCollectionById(id: string): Promise<FavoriteCollectionDocument> {
    const collection = await this.collectionModel.findById(id);
    if (!collection) {
      throw new NotFoundException('收藏夹不存在');
    }
    return collection;
  }

  // 更新收藏夹
  async updateCollection(
    id: string,
    data: { name?: string; description?: string; icon?: string; color?: string; isPrivate?: boolean },
  ): Promise<FavoriteCollectionDocument> {
    const collection = await this.collectionModel.findByIdAndUpdate(id, data, { new: true });
    if (!collection) {
      throw new NotFoundException('收藏夹不存在');
    }
    return collection;
  }

  // 删除收藏夹
  async deleteCollection(id: string, moveToDefault = true): Promise<void> {
    const collection = await this.collectionModel.findById(id);
    if (!collection) {
      throw new NotFoundException('收藏夹不存在');
    }

    if (collection.isDefault) {
      throw new BadRequestException('不能删除默认收藏夹');
    }

    // 移除收藏项中的收藏夹引用
    await this.favoriteModel.updateMany(
      { collections: new Types.ObjectId(id) },
      { $pull: { collections: new Types.ObjectId(id) } },
    );

    await this.collectionModel.findByIdAndDelete(id);
  }

  // 更新收藏夹计数
  private async updateCollectionCount(collectionId: string): Promise<void> {
    const count = await this.favoriteModel.countDocuments({
      collections: new Types.ObjectId(collectionId),
    });

    await this.collectionModel.findByIdAndUpdate(collectionId, { itemCount: count });
  }

  // ============= 统计 =============

  // 获取统计信息
  async getStatistics(userId: string): Promise<{
    totalFavorites: number;
    totalCollections: number;
    byType: { type: string; count: number }[];
    recentFavorites: FavoriteDocument[];
  }> {
    const userObjId = new Types.ObjectId(userId);

    const [totalFavorites, totalCollections, recentFavorites] = await Promise.all([
      this.favoriteModel.countDocuments({ userId: userObjId }),
      this.collectionModel.countDocuments({ userId: userObjId }),
      this.favoriteModel
        .find({ userId: userObjId })
        .sort({ createdAt: -1 })
        .limit(10)
        .exec(),
    ]);

    // 按类型统计
    const typeCounts = await this.favoriteModel.aggregate([
      { $match: { userId: userObjId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const byType = typeCounts.map((t) => ({ type: t._id, count: t.count }));

    return { totalFavorites, totalCollections, byType, recentFavorites };
  }
}
