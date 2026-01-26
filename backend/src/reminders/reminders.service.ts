import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reminder, ReminderDocument, ReminderType } from './schemas/reminder.schema';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectModel(Reminder.name) private reminderModel: Model<ReminderDocument>,
  ) {}

  // 创建提醒
  async create(createDto: Partial<Reminder>): Promise<ReminderDocument> {
    const reminder = new this.reminderModel(createDto);
    reminder.nextTriggerAt = this.calculateNextTrigger(reminder);
    return reminder.save();
  }

  // 计算下次触发时间
  calculateNextTrigger(reminder: Reminder): Date {
    const now = new Date();
    const baseTime = new Date(reminder.reminderTime);

    switch (reminder.type) {
      case ReminderType.ONE_TIME:
        return baseTime > now ? baseTime : null;

      case ReminderType.DAILY:
        const nextDaily = new Date(now);
        nextDaily.setHours(baseTime.getHours(), baseTime.getMinutes(), 0, 0);
        if (nextDaily <= now) {
          nextDaily.setDate(nextDaily.getDate() + 1);
        }
        return nextDaily;

      case ReminderType.WEEKLY:
        if (!reminder.weekDays?.length) return null;
        const nextWeekly = new Date(now);
        nextWeekly.setHours(baseTime.getHours(), baseTime.getMinutes(), 0, 0);
        for (let i = 0; i < 7; i++) {
          const checkDay = (now.getDay() + i) % 7;
          if (reminder.weekDays.includes(checkDay)) {
            nextWeekly.setDate(now.getDate() + i);
            if (nextWeekly > now) return nextWeekly;
          }
        }
        nextWeekly.setDate(now.getDate() + 7);
        return nextWeekly;

      case ReminderType.MONTHLY:
        const nextMonthly = new Date(now);
        nextMonthly.setDate(reminder.monthDay || baseTime.getDate());
        nextMonthly.setHours(baseTime.getHours(), baseTime.getMinutes(), 0, 0);
        if (nextMonthly <= now) {
          nextMonthly.setMonth(nextMonthly.getMonth() + 1);
        }
        return nextMonthly;

      case ReminderType.YEARLY:
        const nextYearly = new Date(baseTime);
        nextYearly.setFullYear(now.getFullYear());
        if (nextYearly <= now) {
          nextYearly.setFullYear(now.getFullYear() + 1);
        }
        return nextYearly;

      default:
        return baseTime;
    }
  }

  // 获取家庭所有提醒
  async findByFamily(familyId: string): Promise<ReminderDocument[]> {
    return this.reminderModel
      .find({ familyId, isActive: true })
      .populate('createdBy', 'username avatar')
      .populate('assignees', 'username avatar')
      .sort({ nextTriggerAt: 1 })
      .exec();
  }

  // 获取用户的提醒
  async findByUser(
    userId: string,
    familyId: string,
  ): Promise<ReminderDocument[]> {
    return this.reminderModel
      .find({
        familyId,
        isActive: true,
        $or: [
          { createdBy: userId },
          { assignees: userId },
        ],
      })
      .populate('createdBy', 'username avatar')
      .populate('assignees', 'username avatar')
      .sort({ nextTriggerAt: 1 })
      .exec();
  }

  // 获取即将触发的提醒
  async getUpcoming(
    familyId: string,
    hours: number = 24,
  ): Promise<ReminderDocument[]> {
    const now = new Date();
    const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

    return this.reminderModel
      .find({
        familyId,
        isActive: true,
        isSnoozed: false,
        nextTriggerAt: { $gte: now, $lte: endTime },
      })
      .populate('createdBy', 'username avatar')
      .populate('assignees', 'username avatar')
      .sort({ nextTriggerAt: 1 })
      .exec();
  }

  // 获取今日提醒
  async getTodayReminders(familyId: string): Promise<ReminderDocument[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.reminderModel
      .find({
        familyId,
        isActive: true,
        nextTriggerAt: { $gte: today, $lt: tomorrow },
      })
      .populate('createdBy', 'username avatar')
      .populate('assignees', 'username avatar')
      .sort({ nextTriggerAt: 1 })
      .exec();
  }

  // 获取单个提醒
  async findById(id: string): Promise<ReminderDocument> {
    const reminder = await this.reminderModel
      .findById(id)
      .populate('createdBy', 'username avatar')
      .populate('assignees', 'username avatar')
      .exec();
    if (!reminder) {
      throw new NotFoundException('提醒不存在');
    }
    return reminder;
  }

  // 更新提醒
  async update(
    id: string,
    updateDto: Partial<Reminder>,
  ): Promise<ReminderDocument> {
    const reminder = await this.reminderModel.findByIdAndUpdate(
      id,
      updateDto,
      { new: true },
    );
    if (!reminder) {
      throw new NotFoundException('提醒不存在');
    }
    // 重新计算下次触发时间
    reminder.nextTriggerAt = this.calculateNextTrigger(reminder);
    return reminder.save();
  }

  // 延后提醒
  async snooze(id: string, minutes: number = 15): Promise<ReminderDocument> {
    const reminder = await this.reminderModel.findById(id);
    if (!reminder) {
      throw new NotFoundException('提醒不存在');
    }

    const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000);
    reminder.isSnoozed = true;
    reminder.snoozeUntil = snoozeUntil;
    return reminder.save();
  }

  // 取消延后
  async cancelSnooze(id: string): Promise<ReminderDocument> {
    const reminder = await this.reminderModel.findById(id);
    if (!reminder) {
      throw new NotFoundException('提醒不存在');
    }

    reminder.isSnoozed = false;
    reminder.snoozeUntil = null;
    return reminder.save();
  }

  // 标记完成（循环提醒）
  async markCompleted(id: string): Promise<ReminderDocument> {
    const reminder = await this.reminderModel.findById(id);
    if (!reminder) {
      throw new NotFoundException('提醒不存在');
    }

    reminder.completedCount++;
    reminder.lastTriggeredAt = new Date();

    if (reminder.type === ReminderType.ONE_TIME) {
      reminder.isActive = false;
    } else {
      reminder.nextTriggerAt = this.calculateNextTrigger(reminder);
      // 检查是否超过结束日期
      if (reminder.endDate && reminder.nextTriggerAt > reminder.endDate) {
        reminder.isActive = false;
      }
    }

    return reminder.save();
  }

  // 切换启用状态
  async toggleActive(id: string): Promise<ReminderDocument> {
    const reminder = await this.reminderModel.findById(id);
    if (!reminder) {
      throw new NotFoundException('提醒不存在');
    }

    reminder.isActive = !reminder.isActive;
    if (reminder.isActive) {
      reminder.nextTriggerAt = this.calculateNextTrigger(reminder);
    }
    return reminder.save();
  }

  // 删除提醒
  async delete(id: string): Promise<void> {
    const result = await this.reminderModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('提醒不存在');
    }
  }

  // 按分类获取
  async findByCategory(
    familyId: string,
    category: string,
  ): Promise<ReminderDocument[]> {
    return this.reminderModel
      .find({ familyId, category, isActive: true })
      .populate('createdBy', 'username avatar')
      .populate('assignees', 'username avatar')
      .sort({ nextTriggerAt: 1 })
      .exec();
  }

  // 获取统计
  async getStatistics(familyId: string): Promise<{
    total: number;
    active: number;
    todayCount: number;
    byCategory: { category: string; count: number }[];
    byPriority: { priority: string; count: number }[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [total, active, todayCount, byCategory, byPriority] = await Promise.all([
      this.reminderModel.countDocuments({ familyId }),
      this.reminderModel.countDocuments({ familyId, isActive: true }),
      this.reminderModel.countDocuments({
        familyId,
        isActive: true,
        nextTriggerAt: { $gte: today, $lt: tomorrow },
      }),
      this.reminderModel.aggregate([
        { $match: { familyId, isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      this.reminderModel.aggregate([
        { $match: { familyId, isActive: true } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      active,
      todayCount,
      byCategory: byCategory.map((item) => ({ category: item._id, count: item.count })),
      byPriority: byPriority.map((item) => ({ priority: item._id, count: item.count })),
    };
  }

  // 批量创建提醒（从其他模块导入）
  async createFromLinkedEntity(
    familyId: string,
    createdBy: string,
    linkedEntity: { type: string; id: string },
    reminderData: Partial<Reminder>,
  ): Promise<ReminderDocument> {
    return this.create({
      ...reminderData,
      familyId,
      createdBy,
      linkedEntity,
    });
  }
}


