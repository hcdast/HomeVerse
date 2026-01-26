import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Anniversary, AnniversaryDocument, AnniversaryType } from './schemas/anniversary.schema';

@Injectable()
export class AnniversariesService {
  private readonly logger = new Logger(AnniversariesService.name);

  constructor(
    @InjectModel(Anniversary.name) private anniversaryModel: Model<AnniversaryDocument>,
  ) {}

  // 创建纪念日
  async create(createDto: Partial<Anniversary>): Promise<AnniversaryDocument> {
    const anniversary = new this.anniversaryModel(createDto);
    return anniversary.save();
  }

  // 获取家庭所有纪念日
  async findByFamily(
    familyId: string,
    userId: string,
  ): Promise<AnniversaryDocument[]> {
    return this.anniversaryModel
      .find({
        familyId,
        $or: [
          { isPrivate: false },
          { isPrivate: true, createdBy: userId },
        ],
      })
      .populate('relatedPerson', 'username avatar')
      .populate('createdBy', 'username avatar')
      .sort({ date: 1 })
      .exec();
  }

  // 获取即将到来的纪念日
  async getUpcoming(
    familyId: string,
    userId: string,
    days: number = 30,
  ): Promise<{
    anniversary: AnniversaryDocument;
    daysUntil: number;
    yearsCount: number;
  }[]> {
    const anniversaries = await this.findByFamily(familyId, userId);
    const today = new Date();
    const upcoming: {
      anniversary: AnniversaryDocument;
      daysUntil: number;
      yearsCount: number;
    }[] = [];

    for (const anniversary of anniversaries) {
      const originalDate = new Date(anniversary.date);
      
      // 计算今年的纪念日日期
      const thisYearDate = new Date(
        today.getFullYear(),
        originalDate.getMonth(),
        originalDate.getDate(),
      );

      // 如果今年已过，看明年
      let targetDate = thisYearDate;
      if (thisYearDate < today) {
        targetDate = new Date(
          today.getFullYear() + 1,
          originalDate.getMonth(),
          originalDate.getDate(),
        );
      }

      const diffTime = targetDate.getTime() - today.getTime();
      const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysUntil <= days && daysUntil >= 0) {
        const yearsCount = targetDate.getFullYear() - originalDate.getFullYear();
        upcoming.push({
          anniversary,
          daysUntil,
          yearsCount,
        });
      }
    }

    // 按天数排序
    return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  }

  // 获取今天的纪念日
  async getTodayAnniversaries(
    familyId: string,
    userId: string,
  ): Promise<AnniversaryDocument[]> {
    const today = new Date();
    const anniversaries = await this.findByFamily(familyId, userId);

    return anniversaries.filter((a) => {
      const date = new Date(a.date);
      return (
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    });
  }

  // 获取需要提醒的纪念日
  async getReminders(
    familyId: string,
    userId: string,
  ): Promise<{
    anniversary: AnniversaryDocument;
    daysUntil: number;
    yearsCount: number;
  }[]> {
    const anniversaries = await this.anniversaryModel.find({
      familyId,
      enableReminder: true,
      $or: [
        { isPrivate: false },
        { isPrivate: true, createdBy: userId },
      ],
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reminders: {
      anniversary: AnniversaryDocument;
      daysUntil: number;
      yearsCount: number;
    }[] = [];

    for (const anniversary of anniversaries) {
      const originalDate = new Date(anniversary.date);
      
      // 计算今年的纪念日日期
      let thisYearDate = new Date(
        today.getFullYear(),
        originalDate.getMonth(),
        originalDate.getDate(),
      );

      // 如果今年已过，看明年
      if (thisYearDate < today) {
        thisYearDate = new Date(
          today.getFullYear() + 1,
          originalDate.getMonth(),
          originalDate.getDate(),
        );
      }

      const diffTime = thisYearDate.getTime() - today.getTime();
      const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // 检查是否在提醒日期列表中
      if (anniversary.remindDaysBefore.includes(daysUntil)) {
        const yearsCount = thisYearDate.getFullYear() - originalDate.getFullYear();
        reminders.push({
          anniversary,
          daysUntil,
          yearsCount,
        });
      }
    }

    return reminders;
  }

  // 获取单个纪念日
  async findById(id: string): Promise<AnniversaryDocument> {
    const anniversary = await this.anniversaryModel
      .findById(id)
      .populate('relatedPerson', 'username avatar')
      .populate('createdBy', 'username avatar')
      .exec();
    if (!anniversary) {
      throw new NotFoundException('纪念日不存在');
    }
    return anniversary;
  }

  // 更新纪念日
  async update(
    id: string,
    updateDto: Partial<Anniversary>,
  ): Promise<AnniversaryDocument> {
    const anniversary = await this.anniversaryModel.findByIdAndUpdate(
      id,
      updateDto,
      { new: true },
    );
    if (!anniversary) {
      throw new NotFoundException('纪念日不存在');
    }
    return anniversary;
  }

  // 删除纪念日
  async delete(id: string): Promise<void> {
    const result = await this.anniversaryModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('纪念日不存在');
    }
  }

  // 添加礼物想法
  async addGiftIdea(id: string, idea: string): Promise<AnniversaryDocument> {
    const anniversary = await this.anniversaryModel.findById(id);
    if (!anniversary) {
      throw new NotFoundException('纪念日不存在');
    }
    anniversary.giftIdeas.push(idea);
    return anniversary.save();
  }

  // 删除礼物想法
  async removeGiftIdea(id: string, index: number): Promise<AnniversaryDocument> {
    const anniversary = await this.anniversaryModel.findById(id);
    if (!anniversary) {
      throw new NotFoundException('纪念日不存在');
    }
    if (index >= 0 && index < anniversary.giftIdeas.length) {
      anniversary.giftIdeas.splice(index, 1);
    }
    return anniversary.save();
  }

  // 添加庆祝记录
  async addCelebrationRecord(
    id: string,
    record: string,
  ): Promise<AnniversaryDocument> {
    const anniversary = await this.anniversaryModel.findById(id);
    if (!anniversary) {
      throw new NotFoundException('纪念日不存在');
    }
    anniversary.celebrationHistory.push(record);
    return anniversary.save();
  }

  // 按类型获取
  async findByType(
    familyId: string,
    type: AnniversaryType,
  ): Promise<AnniversaryDocument[]> {
    return this.anniversaryModel
      .find({ familyId, type })
      .populate('relatedPerson', 'username avatar')
      .sort({ date: 1 })
      .exec();
  }

  // 获取统计
  async getStatistics(familyId: string): Promise<{
    total: number;
    byType: { type: string; count: number }[];
    upcomingThisMonth: number;
  }> {
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [total, byType, allAnniversaries] = await Promise.all([
      this.anniversaryModel.countDocuments({ familyId }),
      this.anniversaryModel.aggregate([
        { $match: { familyId } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      this.anniversaryModel.find({ familyId }),
    ]);

    // 计算本月即将到来的纪念日
    let upcomingThisMonth = 0;
    for (const a of allAnniversaries) {
      const date = new Date(a.date);
      const thisYearDate = new Date(
        today.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );
      if (thisYearDate >= today && thisYearDate <= endOfMonth) {
        upcomingThisMonth++;
      }
    }

    return {
      total,
      byType: byType.map((item) => ({ type: item._id, count: item.count })),
      upcomingThisMonth,
    };
  }
}

