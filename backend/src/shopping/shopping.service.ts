import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ShoppingItem, ShoppingItemDocument, ShoppingStatus, RecurringType } from './schemas/shopping-item.schema';

@Injectable()
export class ShoppingService {
  private readonly logger = new Logger(ShoppingService.name);

  constructor(
    @InjectModel(ShoppingItem.name) private shoppingModel: Model<ShoppingItemDocument>,
  ) {}

  // 创建购物项
  async create(createDto: Partial<ShoppingItem>): Promise<ShoppingItemDocument> {
    const item = new this.shoppingModel(createDto);
    return item.save();
  }

  // 获取家庭购物清单
  async findByFamily(
    familyId: string,
    options?: {
      status?: ShoppingStatus;
      category?: string;
      limit?: number;
    },
  ): Promise<ShoppingItemDocument[]> {
    const query: any = { familyId };

    if (options?.status) {
      query.status = options.status;
    }
    if (options?.category) {
      query.category = options.category;
    }

    let queryBuilder = this.shoppingModel
      .find(query)
      .populate('assignedTo', 'username avatar')
      .populate('purchasedBy', 'username avatar')
      .populate('createdBy', 'username avatar')
      .sort({ priority: -1, createdAt: -1 });

    if (options?.limit) {
      queryBuilder = queryBuilder.limit(options.limit);
    }

    return queryBuilder.exec();
  }

  // 获取待购买清单
  async getPendingList(familyId: string): Promise<ShoppingItemDocument[]> {
    return this.findByFamily(familyId, { status: ShoppingStatus.PENDING });
  }

  // 获取已购买历史
  async getPurchasedHistory(
    familyId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ShoppingItemDocument[]> {
    const query: any = {
      familyId,
      status: ShoppingStatus.PURCHASED,
    };

    if (startDate || endDate) {
      query.purchasedAt = {};
      if (startDate) query.purchasedAt.$gte = startDate;
      if (endDate) query.purchasedAt.$lte = endDate;
    }

    return this.shoppingModel
      .find(query)
      .populate('purchasedBy', 'username avatar')
      .sort({ purchasedAt: -1 })
      .exec();
  }

  // 标记为已购买
  async markAsPurchased(
    id: string,
    userId: string,
    actualPrice?: number,
  ): Promise<ShoppingItemDocument> {
    const item = await this.shoppingModel.findById(id);
    if (!item) {
      throw new NotFoundException('购物项不存在');
    }

    item.status = ShoppingStatus.PURCHASED;
    item.purchasedBy = userId;
    item.purchasedAt = new Date();
    if (actualPrice !== undefined) {
      item.actualPrice = actualPrice;
    }

    // 如果是周期性购买，创建下一个
    if (item.recurringType !== RecurringType.ONCE) {
      await this.createNextRecurringItem(item);
    }

    return item.save();
  }

  // 创建周期性购物项的下一个
  private async createNextRecurringItem(item: ShoppingItemDocument): Promise<void> {
    const nextDate = new Date();
    
    switch (item.recurringType) {
      case RecurringType.WEEKLY:
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case RecurringType.BIWEEKLY:
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case RecurringType.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }

    const newItem = new this.shoppingModel({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      priority: item.priority,
      estimatedPrice: item.estimatedPrice,
      recurringType: item.recurringType,
      notes: item.notes,
      familyId: item.familyId,
      createdBy: item.createdBy,
      tags: item.tags,
      nextRecurringDate: nextDate,
    });

    await newItem.save();
    this.logger.log(`创建周期性购物项: ${item.name}, 下次日期: ${nextDate}`);
  }

  // 取消购物项
  async cancel(id: string): Promise<ShoppingItemDocument> {
    const item = await this.shoppingModel.findByIdAndUpdate(
      id,
      { status: ShoppingStatus.CANCELLED },
      { new: true },
    );
    if (!item) {
      throw new NotFoundException('购物项不存在');
    }
    return item;
  }

  // 更新购物项
  async update(id: string, updateDto: Partial<ShoppingItem>): Promise<ShoppingItemDocument> {
    const item = await this.shoppingModel.findByIdAndUpdate(id, updateDto, { new: true });
    if (!item) {
      throw new NotFoundException('购物项不存在');
    }
    return item;
  }

  // 删除购物项
  async delete(id: string): Promise<void> {
    const result = await this.shoppingModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('购物项不存在');
    }
  }

  // 分配给某人
  async assignTo(id: string, userId: string): Promise<ShoppingItemDocument> {
    const item = await this.shoppingModel.findByIdAndUpdate(
      id,
      { assignedTo: userId },
      { new: true },
    );
    if (!item) {
      throw new NotFoundException('购物项不存在');
    }
    return item;
  }

  // 获取统计信息
  async getStatistics(familyId: string): Promise<{
    pending: number;
    purchased: number;
    totalSpent: number;
    thisMonthSpent: number;
    byCategory: { category: string; count: number; spent: number }[];
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [pending, purchased, thisMonthPurchased, byCategory] = await Promise.all([
      this.shoppingModel.countDocuments({ familyId, status: ShoppingStatus.PENDING }),
      this.shoppingModel.countDocuments({ familyId, status: ShoppingStatus.PURCHASED }),
      this.shoppingModel.find({
        familyId,
        status: ShoppingStatus.PURCHASED,
        purchasedAt: { $gte: startOfMonth },
      }),
      this.shoppingModel.aggregate([
        { $match: { familyId, status: ShoppingStatus.PURCHASED } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            spent: { $sum: '$actualPrice' },
          },
        },
      ]),
    ]);

    const totalSpent = await this.shoppingModel.aggregate([
      { $match: { familyId, status: ShoppingStatus.PURCHASED } },
      { $group: { _id: null, total: { $sum: '$actualPrice' } } },
    ]);

    const thisMonthSpent = thisMonthPurchased.reduce(
      (sum, item) => sum + (item.actualPrice || 0),
      0,
    );

    return {
      pending,
      purchased,
      totalSpent: totalSpent[0]?.total || 0,
      thisMonthSpent,
      byCategory: byCategory.map((item) => ({
        category: item._id,
        count: item.count,
        spent: item.spent || 0,
      })),
    };
  }
}

