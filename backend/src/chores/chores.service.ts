import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chore, ChoreDocument, ChoreStatus, ChoreFrequency } from './schemas/chore.schema';

@Injectable()
export class ChoresService {
  private readonly logger = new Logger(ChoresService.name);

  constructor(
    @InjectModel(Chore.name) private choreModel: Model<ChoreDocument>,
  ) {}

  // 创建家务
  async create(createDto: Partial<Chore>): Promise<ChoreDocument> {
    const chore = new this.choreModel(createDto);
    
    // 计算下次应完成日期
    chore.nextDueDate = this.calculateNextDueDate(chore);
    
    return chore.save();
  }

  // 计算下次应完成日期
  private calculateNextDueDate(chore: Partial<Chore>): Date {
    const now = new Date();
    
    switch (chore.frequency) {
      case ChoreFrequency.DAILY:
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
      case ChoreFrequency.WEEKLY:
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return nextWeek;
      case ChoreFrequency.BIWEEKLY:
        const biweekly = new Date(now);
        biweekly.setDate(biweekly.getDate() + 14);
        return biweekly;
      case ChoreFrequency.MONTHLY:
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      default:
        return chore.dueDate || now;
    }
  }

  // 获取家庭所有家务
  async findByFamily(familyId: string): Promise<ChoreDocument[]> {
    return this.choreModel
      .find({ familyId })
      .populate('assignedTo', 'username avatar')
      .populate('rotationMembers', 'username avatar')
      .populate('createdBy', 'username avatar')
      .populate('completionHistory.completedBy', 'username avatar')
      .sort({ nextDueDate: 1, createdAt: -1 })
      .exec();
  }

  // 获取用户分配的家务
  async findByUser(familyId: string, userId: string): Promise<ChoreDocument[]> {
    return this.choreModel
      .find({ familyId, assignedTo: userId, status: { $ne: ChoreStatus.COMPLETED } })
      .populate('assignedTo', 'username avatar')
      .sort({ nextDueDate: 1 })
      .exec();
  }

  // 获取今日待完成家务
  async getTodayChores(familyId: string): Promise<ChoreDocument[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.choreModel
      .find({
        familyId,
        status: { $in: [ChoreStatus.PENDING, ChoreStatus.IN_PROGRESS] },
        $or: [
          { nextDueDate: { $gte: today, $lt: tomorrow } },
          { frequency: ChoreFrequency.DAILY },
        ],
      })
      .populate('assignedTo', 'username avatar')
      .sort({ dueTime: 1 })
      .exec();
  }

  // 获取单个家务
  async findById(id: string): Promise<ChoreDocument> {
    const chore = await this.choreModel
      .findById(id)
      .populate('assignedTo', 'username avatar')
      .populate('rotationMembers', 'username avatar')
      .populate('completionHistory.completedBy', 'username avatar')
      .exec();
    if (!chore) {
      throw new NotFoundException('家务不存在');
    }
    return chore;
  }

  // 完成家务
  async complete(
    id: string,
    userId: string,
    data?: { rating?: number; notes?: string },
  ): Promise<ChoreDocument> {
    const chore = await this.choreModel.findById(id);
    if (!chore) {
      throw new NotFoundException('家务不存在');
    }

    // 添加完成记录
    chore.completionHistory.push({
      completedBy: userId,
      completedAt: new Date(),
      rating: data?.rating,
      notes: data?.notes,
      pointsEarned: chore.points,
    });

    chore.lastCompletedAt = new Date();

    // 如果是周期性家务，重置状态并计算下次日期
    if (chore.frequency !== ChoreFrequency.ONCE) {
      chore.status = ChoreStatus.PENDING;
      chore.nextDueDate = this.calculateNextDueDate(chore);
      
      // 如果开启轮换，切换到下一个人
      if (chore.rotationEnabled && chore.rotationMembers.length > 0) {
        chore.currentRotationIndex = (chore.currentRotationIndex + 1) % chore.rotationMembers.length;
        chore.assignedTo = chore.rotationMembers[chore.currentRotationIndex];
      }
    } else {
      chore.status = ChoreStatus.COMPLETED;
    }

    return chore.save();
  }

  // 跳过家务
  async skip(id: string): Promise<ChoreDocument> {
    const chore = await this.choreModel.findById(id);
    if (!chore) {
      throw new NotFoundException('家务不存在');
    }

    if (chore.frequency !== ChoreFrequency.ONCE) {
      chore.nextDueDate = this.calculateNextDueDate(chore);
    } else {
      chore.status = ChoreStatus.SKIPPED;
    }

    return chore.save();
  }

  // 更新家务
  async update(id: string, updateDto: Partial<Chore>): Promise<ChoreDocument> {
    const chore = await this.choreModel.findByIdAndUpdate(id, updateDto, { new: true });
    if (!chore) {
      throw new NotFoundException('家务不存在');
    }
    return chore;
  }

  // 删除家务
  async delete(id: string): Promise<void> {
    const result = await this.choreModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('家务不存在');
    }
  }

  // 分配家务
  async assign(id: string, userId: string): Promise<ChoreDocument> {
    const chore = await this.choreModel.findByIdAndUpdate(
      id,
      { assignedTo: userId },
      { new: true },
    );
    if (!chore) {
      throw new NotFoundException('家务不存在');
    }
    return chore;
  }

  // 获取排行榜
  async getLeaderboard(familyId: string): Promise<{
    userId: string;
    username: string;
    avatar: string;
    completedCount: number;
    totalPoints: number;
  }[]> {
    const chores = await this.choreModel
      .find({ familyId })
      .populate('completionHistory.completedBy', 'username avatar')
      .exec();

    const userStats: Record<string, {
      userId: string;
      username: string;
      avatar: string;
      completedCount: number;
      totalPoints: number;
    }> = {};

    for (const chore of chores) {
      for (const completion of chore.completionHistory) {
        const user = completion.completedBy as any;
        if (!user || !user._id) continue;

        const id = user._id.toString();
        if (!userStats[id]) {
          userStats[id] = {
            userId: id,
            username: user.username || '未知',
            avatar: user.avatar || '',
            completedCount: 0,
            totalPoints: 0,
          };
        }
        userStats[id].completedCount++;
        userStats[id].totalPoints += completion.pointsEarned || 0;
      }
    }

    return Object.values(userStats).sort((a, b) => b.totalPoints - a.totalPoints);
  }

  // 获取统计信息
  async getStatistics(familyId: string): Promise<{
    total: number;
    pending: number;
    completedToday: number;
    completedThisWeek: number;
    byCategory: { category: string; count: number }[];
  }> {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const chores = await this.choreModel.find({ familyId });

    let completedToday = 0;
    let completedThisWeek = 0;

    for (const chore of chores) {
      for (const completion of chore.completionHistory) {
        const completedDate = new Date(completion.completedAt);
        if (completedDate >= today) {
          completedToday++;
        }
        if (completedDate >= weekStart) {
          completedThisWeek++;
        }
      }
    }

    const byCategory = await this.choreModel.aggregate([
      { $match: { familyId } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    return {
      total: chores.length,
      pending: chores.filter(c => c.status === ChoreStatus.PENDING).length,
      completedToday,
      completedThisWeek,
      byCategory: byCategory.map(item => ({
        category: item._id,
        count: item.count,
      })),
    };
  }
}

