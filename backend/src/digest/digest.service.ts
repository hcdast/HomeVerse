import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Digest,
  DigestDocument,
  DigestType,
  DigestStatus,
  DigestSubscription,
  DigestSubscriptionDocument,
} from './schemas/digest.schema';
import { AiService } from '../ai/ai.service';

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    @InjectModel(Digest.name) private digestModel: Model<DigestDocument>,
    @InjectModel(DigestSubscription.name)
    private subscriptionModel: Model<DigestSubscriptionDocument>,
    @InjectModel('Todo') private todoModel: Model<any>,
    @InjectModel('Chore') private choreModel: Model<any>,
    @InjectModel('Album') private albumModel: Model<any>,
    @InjectModel('Article') private articleModel: Model<any>,
    @InjectModel('CalendarEvent') private calendarModel: Model<any>,
    @InjectModel('Transaction') private transactionModel: Model<any>,
    @InjectModel('Point') private pointModel: Model<any>,
    @InjectModel('Message') private messageModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
    private aiService: AiService,
  ) {}

  // ============= 摘要生成 =============

  // 生成日报
  async generateDailyDigest(familyId: string): Promise<DigestDocument> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return this.generateDigest(familyId, DigestType.DAILY, yesterday, today);
  }

  // 生成周报
  async generateWeeklyDigest(familyId: string): Promise<DigestDocument> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    return this.generateDigest(familyId, DigestType.WEEKLY, weekAgo, today);
  }

  // 生成月报
  async generateMonthlyDigest(familyId: string): Promise<DigestDocument> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    return this.generateDigest(familyId, DigestType.MONTHLY, monthAgo, today);
  }

  // 核心生成逻辑
  private async generateDigest(
    familyId: string,
    type: DigestType,
    startDate: Date,
    endDate: Date,
  ): Promise<DigestDocument> {
    const familyObjId = new Types.ObjectId(familyId);

    // 创建摘要记录
    const title = this.getDigestTitle(type, startDate, endDate);
    const digest = new this.digestModel({
      familyId: familyObjId,
      type,
      status: DigestStatus.GENERATING,
      title,
      startDate,
      endDate,
    });
    await digest.save();

    try {
      // 收集活动数据
      const [
        todosData,
        choresData,
        photosData,
        articlesData,
        eventsData,
        transactionsData,
        pointsData,
        messagesData,
        memberContributions,
      ] = await Promise.all([
        this.getTodosStats(familyObjId, startDate, endDate),
        this.getChoresStats(familyObjId, startDate, endDate),
        this.getPhotosStats(familyObjId, startDate, endDate),
        this.getArticlesStats(familyObjId, startDate, endDate),
        this.getEventsStats(familyObjId, startDate, endDate),
        this.getTransactionsStats(familyObjId, startDate, endDate),
        this.getPointsStats(familyObjId, startDate, endDate),
        this.getMessagesStats(familyObjId, startDate, endDate),
        this.getMemberContributions(familyObjId, startDate, endDate),
      ]);

      // 更新活动摘要
      digest.activitySummary = {
        todosCompleted: todosData.completed,
        todosCreated: todosData.created,
        choresCompleted: choresData.completed,
        photosUploaded: photosData.count,
        articlesCreated: articlesData.count,
        eventsCreated: eventsData.count,
        messagesCount: messagesData.count,
        transactionsCount: transactionsData.count,
        totalIncome: transactionsData.income,
        totalExpense: transactionsData.expense,
        pointsEarned: pointsData.earned,
      };

      // 更新成员贡献
      digest.memberContributions = memberContributions;

      // 生成亮点
      digest.highlights = await this.generateHighlights(familyObjId, startDate, endDate);

      // 获取即将到来的事件
      digest.upcomingEvents = await this.getUpcomingEvents(familyObjId);

      // 使用AI生成总结和建议
      if (this.aiService.isConfigured()) {
        try {
          const aiContent = await this.generateAiContent(digest);
          digest.aiSummary = aiContent.summary;
          digest.aiSuggestions = aiContent.suggestions;
        } catch (aiError) {
          this.logger.warn('AI生成失败，使用默认内容', aiError);
          digest.aiSummary = this.generateDefaultSummary(digest);
          digest.aiSuggestions = this.generateDefaultSuggestions(digest);
        }
      } else {
        digest.aiSummary = this.generateDefaultSummary(digest);
        digest.aiSuggestions = this.generateDefaultSuggestions(digest);
      }

      digest.status = DigestStatus.COMPLETED;
      await digest.save();

      return digest;
    } catch (error) {
      this.logger.error('生成摘要失败', error);
      digest.status = DigestStatus.FAILED;
      digest.errorMessage = error.message;
      await digest.save();
      throw error;
    }
  }

  // ============= 数据收集方法 =============

  private async getTodosStats(familyId: Types.ObjectId, startDate: Date, endDate: Date) {
    try {
      const [completed, created] = await Promise.all([
        this.todoModel.countDocuments({
          familyId,
          completed: true,
          updatedAt: { $gte: startDate, $lt: endDate },
        }),
        this.todoModel.countDocuments({
          familyId,
          createdAt: { $gte: startDate, $lt: endDate },
        }),
      ]);
      return { completed, created };
    } catch {
      return { completed: 0, created: 0 };
    }
  }

  private async getChoresStats(familyId: Types.ObjectId, startDate: Date, endDate: Date) {
    try {
      const chores = await this.choreModel.find({ familyId });
      let completed = 0;
      for (const chore of chores) {
        completed += (chore.completionHistory || []).filter(
          (c: any) => new Date(c.completedAt) >= startDate && new Date(c.completedAt) < endDate,
        ).length;
      }
      return { completed };
    } catch {
      return { completed: 0 };
    }
  }

  private async getPhotosStats(familyId: Types.ObjectId, startDate: Date, endDate: Date) {
    try {
      const albums = await this.albumModel.find({ familyId });
      let count = 0;
      for (const album of albums) {
        count += (album.photos || []).filter(
          (p: any) => new Date(p.uploadedAt) >= startDate && new Date(p.uploadedAt) < endDate,
        ).length;
      }
      return { count };
    } catch {
      return { count: 0 };
    }
  }

  private async getArticlesStats(familyId: Types.ObjectId, startDate: Date, endDate: Date) {
    try {
      const count = await this.articleModel.countDocuments({
        familyId,
        createdAt: { $gte: startDate, $lt: endDate },
      });
      return { count };
    } catch {
      return { count: 0 };
    }
  }

  private async getEventsStats(familyId: Types.ObjectId, startDate: Date, endDate: Date) {
    try {
      const count = await this.calendarModel.countDocuments({
        familyId,
        createdAt: { $gte: startDate, $lt: endDate },
      });
      return { count };
    } catch {
      return { count: 0 };
    }
  }

  private async getTransactionsStats(familyId: Types.ObjectId, startDate: Date, endDate: Date) {
    try {
      const transactions = await this.transactionModel.find({
        familyId,
        date: { $gte: startDate, $lt: endDate },
      });
      let income = 0;
      let expense = 0;
      for (const t of transactions) {
        if (t.type === 'income') income += t.amount;
        else expense += t.amount;
      }
      return { count: transactions.length, income, expense };
    } catch {
      return { count: 0, income: 0, expense: 0 };
    }
  }

  private async getPointsStats(familyId: Types.ObjectId, startDate: Date, endDate: Date) {
    try {
      const result = await this.pointModel.aggregate([
        {
          $match: {
            familyId,
            type: 'earn',
            createdAt: { $gte: startDate, $lt: endDate },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      return { earned: result[0]?.total || 0 };
    } catch {
      return { earned: 0 };
    }
  }

  private async getMessagesStats(familyId: Types.ObjectId, startDate: Date, endDate: Date) {
    try {
      const count = await this.messageModel.countDocuments({
        familyId,
        createdAt: { $gte: startDate, $lt: endDate },
      });
      return { count };
    } catch {
      return { count: 0 };
    }
  }

  private async getMemberContributions(familyId: Types.ObjectId, startDate: Date, endDate: Date) {
    try {
      const users = await this.userModel.find({ familyId });
      const contributions = [];

      for (const user of users) {
        const [todosCompleted, choresCompleted, photosUploaded, pointsEarned] = await Promise.all([
          this.todoModel.countDocuments({
            familyId,
            assignedTo: user._id,
            completed: true,
            updatedAt: { $gte: startDate, $lt: endDate },
          }).catch(() => 0),
          this.getChoresCompletedByUser(familyId, user._id, startDate, endDate),
          this.getPhotosUploadedByUser(familyId, user._id, startDate, endDate),
          this.getPointsEarnedByUser(familyId, user._id, startDate, endDate),
        ]);

        contributions.push({
          userId: user._id,
          username: user.username,
          todosCompleted,
          choresCompleted,
          photosUploaded,
          pointsEarned,
        });
      }

      return contributions.sort((a, b) => b.pointsEarned - a.pointsEarned);
    } catch {
      return [];
    }
  }

  private async getChoresCompletedByUser(familyId: Types.ObjectId, userId: Types.ObjectId, startDate: Date, endDate: Date): Promise<number> {
    try {
      const chores = await this.choreModel.find({ familyId });
      let count = 0;
      for (const chore of chores) {
        count += (chore.completionHistory || []).filter(
          (c: any) =>
            c.completedBy?.toString() === userId.toString() &&
            new Date(c.completedAt) >= startDate &&
            new Date(c.completedAt) < endDate,
        ).length;
      }
      return count;
    } catch {
      return 0;
    }
  }

  private async getPhotosUploadedByUser(familyId: Types.ObjectId, userId: Types.ObjectId, startDate: Date, endDate: Date): Promise<number> {
    try {
      const albums = await this.albumModel.find({ familyId });
      let count = 0;
      for (const album of albums) {
        count += (album.photos || []).filter(
          (p: any) =>
            p.uploadedBy?.toString() === userId.toString() &&
            new Date(p.uploadedAt) >= startDate &&
            new Date(p.uploadedAt) < endDate,
        ).length;
      }
      return count;
    } catch {
      return 0;
    }
  }

  private async getPointsEarnedByUser(familyId: Types.ObjectId, userId: Types.ObjectId, startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await this.pointModel.aggregate([
        {
          $match: {
            familyId,
            userId,
            type: 'earn',
            createdAt: { $gte: startDate, $lt: endDate },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      return result[0]?.total || 0;
    } catch {
      return 0;
    }
  }

  private async generateHighlights(familyId: Types.ObjectId, startDate: Date, endDate: Date) {
    const highlights = [];

    // 获取最活跃成员
    try {
      const topMember = await this.pointModel.aggregate([
        { $match: { familyId, type: 'earn', createdAt: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: '$userId', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
        { $limit: 1 },
      ]);

      if (topMember.length > 0) {
        const user = await this.userModel.findById(topMember[0]._id);
        if (user) {
          highlights.push({
            type: 'achievement',
            title: '最活跃成员',
            description: `${user.username} 获得了 ${topMember[0].total} 积分`,
            icon: '🏆',
            relatedUser: user._id,
          });
        }
      }
    } catch (e) {
      // 忽略错误
    }

    return highlights;
  }

  private async getUpcomingEvents(familyId: Types.ObjectId): Promise<string[]> {
    try {
      const now = new Date();
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const events = await this.calendarModel
        .find({
          familyId,
          startDate: { $gte: now, $lte: nextWeek },
        })
        .sort({ startDate: 1 })
        .limit(5);

      return events.map((e: any) => `${e.title} (${new Date(e.startDate).toLocaleDateString()})`);
    } catch {
      return [];
    }
  }

  // ============= AI 内容生成 =============

  private async generateAiContent(digest: DigestDocument): Promise<{ summary: string; suggestions: string }> {
    const prompt = `作为家庭管理助手，请根据以下家庭活动数据生成一份温馨的${
      digest.type === DigestType.DAILY ? '日报' : digest.type === DigestType.WEEKLY ? '周报' : '月报'
    }总结和建议：

活动数据：
- 完成待办事项: ${digest.activitySummary.todosCompleted} 项
- 完成家务: ${digest.activitySummary.choresCompleted} 次
- 上传照片: ${digest.activitySummary.photosUploaded} 张
- 发布文章: ${digest.activitySummary.articlesCreated} 篇
- 收入: ¥${digest.activitySummary.totalIncome}
- 支出: ¥${digest.activitySummary.totalExpense}
- 获得积分: ${digest.activitySummary.pointsEarned}

成员贡献排行：
${digest.memberContributions.slice(0, 3).map((m, i) => `${i + 1}. ${m.username}: ${m.pointsEarned}积分`).join('\n')}

请生成：
1. 一段50-100字的温馨总结
2. 2-3条实用建议

格式：
总结：[总结内容]
建议：[建议内容]`;

    const response = await this.aiService.generateArticleContent(prompt);
    
    const summaryMatch = response.match(/总结[：:]\s*(.+?)(?=建议|$)/s);
    const suggestionsMatch = response.match(/建议[：:]\s*(.+)/s);

    return {
      summary: summaryMatch?.[1]?.trim() || this.generateDefaultSummary(digest),
      suggestions: suggestionsMatch?.[1]?.trim() || this.generateDefaultSuggestions(digest),
    };
  }

  private generateDefaultSummary(digest: DigestDocument): string {
    const { activitySummary } = digest;
    const typeLabel = digest.type === DigestType.DAILY ? '今天' : digest.type === DigestType.WEEKLY ? '本周' : '本月';
    
    return `${typeLabel}家庭成员共完成了 ${activitySummary.todosCompleted} 项待办事项和 ${activitySummary.choresCompleted} 次家务，上传了 ${activitySummary.photosUploaded} 张珍贵照片。大家的共同努力让家庭生活更加美好！继续保持，一起创造更多美好回忆。`;
  }

  private generateDefaultSuggestions(digest: DigestDocument): string {
    const suggestions = [];
    const { activitySummary } = digest;

    if (activitySummary.todosCompleted < 5) {
      suggestions.push('可以尝试将大任务拆分成小目标，更容易完成');
    }
    if (activitySummary.totalExpense > activitySummary.totalIncome * 0.8) {
      suggestions.push('本期支出较多，建议关注预算控制');
    }
    if (activitySummary.photosUploaded === 0) {
      suggestions.push('记得拍照记录生活中的美好瞬间');
    }

    return suggestions.length > 0 ? suggestions.join('；') : '继续保持良好的家庭生活习惯！';
  }

  private getDigestTitle(type: DigestType, startDate: Date, endDate: Date): string {
    const formatDate = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;
    
    switch (type) {
      case DigestType.DAILY:
        return `${formatDate(startDate)} 家庭日报`;
      case DigestType.WEEKLY:
        return `${formatDate(startDate)} - ${formatDate(endDate)} 家庭周报`;
      case DigestType.MONTHLY:
        return `${startDate.getFullYear()}年${startDate.getMonth() + 1}月 家庭月报`;
      default:
        return '家庭活动摘要';
    }
  }

  // ============= 摘要查询 =============

  // 获取摘要列表
  async getDigests(
    familyId: string,
    options: { type?: DigestType; page?: number; limit?: number } = {},
  ): Promise<{ digests: DigestDocument[]; total: number }> {
    const { type, page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const filter: any = {
      familyId: new Types.ObjectId(familyId),
      status: DigestStatus.COMPLETED,
    };
    if (type) filter.type = type;

    const [digests, total] = await Promise.all([
      this.digestModel.find(filter).sort({ endDate: -1 }).skip(skip).limit(limit).exec(),
      this.digestModel.countDocuments(filter),
    ]);

    return { digests, total };
  }

  // 获取单个摘要
  async getDigestById(id: string): Promise<DigestDocument> {
    const digest = await this.digestModel
      .findById(id)
      .populate('memberContributions.userId', 'username avatar')
      .populate('highlights.relatedUser', 'username avatar')
      .exec();

    if (!digest) {
      throw new NotFoundException('摘要不存在');
    }

    return digest;
  }

  // 获取最新摘要
  async getLatestDigest(familyId: string, type?: DigestType): Promise<DigestDocument | null> {
    const filter: any = {
      familyId: new Types.ObjectId(familyId),
      status: DigestStatus.COMPLETED,
    };
    if (type) filter.type = type;

    return this.digestModel.findOne(filter).sort({ endDate: -1 }).exec();
  }

  // 标记为已读
  async markAsRead(id: string, userId: string): Promise<DigestDocument> {
    const digest = await this.digestModel.findById(id);
    if (!digest) {
      throw new NotFoundException('摘要不存在');
    }

    const userObjId = new Types.ObjectId(userId);
    if (!digest.readBy.some((uid) => uid.equals(userObjId))) {
      digest.readBy.push(userObjId);
      await digest.save();
    }

    return digest;
  }

  // ============= 订阅管理 =============

  // 获取用户订阅设置
  async getSubscription(userId: string, familyId: string): Promise<DigestSubscriptionDocument> {
    let subscription = await this.subscriptionModel.findOne({
      userId: new Types.ObjectId(userId),
      familyId: new Types.ObjectId(familyId),
    });

    if (!subscription) {
      subscription = new this.subscriptionModel({
        userId: new Types.ObjectId(userId),
        familyId: new Types.ObjectId(familyId),
      });
      await subscription.save();
    }

    return subscription;
  }

  // 更新订阅设置
  async updateSubscription(
    userId: string,
    familyId: string,
    settings: Partial<{
      dailyEnabled: boolean;
      weeklyEnabled: boolean;
      monthlyEnabled: boolean;
      preferredTime: string;
      emailEnabled: boolean;
      pushEnabled: boolean;
    }>,
  ): Promise<DigestSubscriptionDocument> {
    return this.subscriptionModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        familyId: new Types.ObjectId(familyId),
      },
      { $set: settings },
      { new: true, upsert: true },
    );
  }
}
