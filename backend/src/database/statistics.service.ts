import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';

export interface DashboardStats {
  overview: {
    totalAlbums: number;
    totalFiles: number;
    totalArticles: number;
    totalMembers: number;
    totalPhotos: number;
    storageUsed: number;
  };
  finance: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    monthlyTrend: Array<{
      month: string;
      income: number;
      expense: number;
    }>;
    categoryBreakdown: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
  };
  activities: {
    recentActivities: Array<{
      type: string;
      description: string;
      timestamp: Date;
      user: string;
    }>;
    weeklyActivityCount: number[];
  };
  todos: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    completionRate: number;
  };
  health: {
    latestRecords: Array<{
      memberId: string;
      memberName: string;
      weight?: number;
      height?: number;
      date: Date;
    }>;
  };
}

@Injectable()
export class StatisticsService {
  constructor(
    @InjectConnection() private connection: Connection,
  ) {}

  async getDashboardStats(familyId: string): Promise<DashboardStats> {
    const familyObjectId = new Types.ObjectId(familyId);

    const [
      overview,
      finance,
      activities,
      todos,
      health,
    ] = await Promise.all([
      this.getOverviewStats(familyObjectId),
      this.getFinanceStats(familyObjectId),
      this.getActivityStats(familyObjectId),
      this.getTodoStats(familyObjectId),
      this.getHealthStats(familyObjectId),
    ]);

    return {
      overview,
      finance,
      activities,
      todos,
      health,
    };
  }

  private async getOverviewStats(familyId: Types.ObjectId) {
    const albumsCollection = this.connection.collection('albums');
    const filesCollection = this.connection.collection('files');
    const articlesCollection = this.connection.collection('articles');
    const usersCollection = this.connection.collection('users');

    const [albums, files, articles, members] = await Promise.all([
      albumsCollection.countDocuments({ familyId }),
      filesCollection.countDocuments({ familyId }),
      articlesCollection.countDocuments({ familyId }),
      usersCollection.countDocuments({ familyId }),
    ]);

    // 计算照片总数
    const photoAggregation = await albumsCollection.aggregate([
      { $match: { familyId } },
      { $project: { photoCount: { $size: { $ifNull: ['$photos', []] } } } },
      { $group: { _id: null, total: { $sum: '$photoCount' } } },
    ]).toArray();

    const totalPhotos = photoAggregation[0]?.total || 0;

    // 计算存储使用
    const storageAggregation = await filesCollection.aggregate([
      { $match: { familyId } },
      { $group: { _id: null, total: { $sum: '$size' } } },
    ]).toArray();

    const storageUsed = storageAggregation[0]?.total || 0;

    return {
      totalAlbums: albums,
      totalFiles: files,
      totalArticles: articles,
      totalMembers: members,
      totalPhotos,
      storageUsed,
    };
  }

  private async getFinanceStats(familyId: Types.ObjectId) {
    const financeCollection = this.connection.collection('finances');
    
    // 获取本年的月度趋势
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    const monthlyData = await financeCollection.aggregate([
      {
        $match: {
          familyId,
          date: { $gte: startOfYear, $lte: endOfYear },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
    ]).toArray();

    // 整理月度数据
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const monthlyTrend = months.map((month, index) => {
      const income = monthlyData.find(d => d._id.month === index + 1 && d._id.type === 'income')?.total || 0;
      const expense = monthlyData.find(d => d._id.month === index + 1 && d._id.type === 'expense')?.total || 0;
      return { month, income, expense };
    });

    // 获取总收入和支出
    const totals = await financeCollection.aggregate([
      { $match: { familyId } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]).toArray();

    const totalIncome = totals.find(t => t._id === 'income')?.total || 0;
    const totalExpense = totals.find(t => t._id === 'expense')?.total || 0;

    // 获取分类统计
    const categoryData = await financeCollection.aggregate([
      { $match: { familyId, type: 'expense' } },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: 6 },
    ]).toArray();

    const categoryBreakdown = categoryData.map(c => ({
      category: c._id || '其他',
      amount: c.amount,
      percentage: totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0,
    }));

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      monthlyTrend,
      categoryBreakdown,
    };
  }

  private async getActivityStats(familyId: Types.ObjectId) {
    const logsCollection = this.connection.collection('activitylogs');
    
    // 获取最近活动
    const recentActivities = await logsCollection.find({ familyId })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    // 获取本周每日活动数量
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weeklyData = await logsCollection.aggregate([
      {
        $match: {
          familyId,
          createdAt: { $gte: weekStart },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          count: { $sum: 1 },
        },
      },
    ]).toArray();

    const weeklyActivityCount = [0, 0, 0, 0, 0, 0, 0];
    weeklyData.forEach(d => {
      weeklyActivityCount[d._id - 1] = d.count;
    });

    return {
      recentActivities: recentActivities.map(a => ({
        type: a.action,
        description: a.description || '',
        timestamp: a.createdAt,
        user: a.userName || '',
      })),
      weeklyActivityCount,
    };
  }

  private async getTodoStats(familyId: Types.ObjectId) {
    const todosCollection = this.connection.collection('todos');
    const now = new Date();

    const [total, completed, overdue] = await Promise.all([
      todosCollection.countDocuments({ familyId }),
      todosCollection.countDocuments({ familyId, status: 'completed' }),
      todosCollection.countDocuments({
        familyId,
        status: { $ne: 'completed' },
        dueDate: { $lt: now },
      }),
    ]);

    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      pending,
      overdue,
      completionRate,
    };
  }

  private async getHealthStats(familyId: Types.ObjectId) {
    const healthCollection = this.connection.collection('healths');
    const usersCollection = this.connection.collection('users');

    // 获取家庭成员
    const members = await usersCollection.find({ familyId }).toArray();

    // 获取每个成员的最新健康记录
    const latestRecords = await Promise.all(
      members.map(async (member) => {
        const records = await healthCollection
          .find({ memberId: member._id })
          .sort({ date: -1 })
          .limit(1)
          .toArray();
        
        const record = records[0];

        return {
          memberId: member._id.toString(),
          memberName: member.username,
          weight: record?.weight,
          height: record?.height,
          date: record?.date || new Date(),
        };
      }),
    );

    return { latestRecords };
  }

  // 获取财务趋势
  async getFinanceTrend(familyId: string, period: 'week' | 'month' | 'year' = 'month') {
    const familyObjectId = new Types.ObjectId(familyId);
    const financeCollection = this.connection.collection('finances');

    const now = new Date();
    let startDate: Date;
    let groupBy: any;

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        groupBy = { $dayOfMonth: '$date' };
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        groupBy = { $dayOfMonth: '$date' };
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        groupBy = { $month: '$date' };
        break;
    }

    const data = await financeCollection.aggregate([
      {
        $match: {
          familyId: familyObjectId,
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            period: groupBy,
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.period': 1 } },
    ]).toArray();

    return data;
  }
}

