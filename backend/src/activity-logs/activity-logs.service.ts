import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ActivityLog, ActivityLogDocument, ActivityAction, ActivityLevel } from './schemas/activity-log.schema';
import { CreateActivityLogDto, QueryActivityLogsDto } from './dto/activity-log.dto';

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectModel(ActivityLog.name)
    private activityLogModel: Model<ActivityLogDocument>,
  ) {}

  // 创建活动日志
  async create(createDto: CreateActivityLogDto): Promise<ActivityLog> {
    const log = new this.activityLogModel(createDto);
    return log.save();
  }

  // 获取家庭活动日志
  async findByFamily(
    familyId: string,
    query: QueryActivityLogsDto,
  ): Promise<{ logs: ActivityLog[]; total: number }> {
    const { action, userId, level, startDate, endDate, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const filter: any = { familyId: new Types.ObjectId(familyId) };

    if (action) filter.action = action;
    if (userId) filter.userId = new Types.ObjectId(userId);
    if (level) filter.level = level;

    // 时间范围筛选
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      this.activityLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username avatar')
        .exec(),
      this.activityLogModel.countDocuments(filter),
    ]);

    return { logs, total };
  }

  // 获取用户活动日志
  async findByUser(
    userId: string,
    query: QueryActivityLogsDto,
  ): Promise<{ logs: ActivityLog[]; total: number }> {
    const { action, level, startDate, endDate, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const filter: any = { userId: new Types.ObjectId(userId) };

    if (action) filter.action = action;
    if (level) filter.level = level;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      this.activityLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.activityLogModel.countDocuments(filter),
    ]);

    return { logs, total };
  }

  // 获取统计数据
  async getStatistics(familyId: string, days: number = 7): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.activityLogModel
      .find({
        familyId: new Types.ObjectId(familyId),
        createdAt: { $gte: startDate },
      })
      .exec();

    // 按日期分组统计
    const dailyStats = new Map<string, number>();
    const actionStats = new Map<ActivityAction, number>();
    const userStats = new Map<string, number>();

    logs.forEach(log => {
      // 日期统计
      const date = (log as any).createdAt.toISOString().split('T')[0];
      dailyStats.set(date, (dailyStats.get(date) || 0) + 1);

      // 操作类型统计
      actionStats.set(log.action, (actionStats.get(log.action) || 0) + 1);

      // 用户活跃度统计
      const userId = log.userId.toString();
      userStats.set(userId, (userStats.get(userId) || 0) + 1);
    });

    return {
      totalActivities: logs.length,
      dailyStats: Array.from(dailyStats.entries()).map(([date, count]) => ({ date, count })),
      actionStats: Array.from(actionStats.entries()).map(([action, count]) => ({ action, count })),
      topActiveUsers: Array.from(userStats.entries())
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  }

  // ============= 业务日志记录方法 =============

  // 记录用户登录
  async logUserLogin(userId: string, ipAddress?: string, userAgent?: string) {
    return this.create({
      userId,
      action: ActivityAction.USER_LOGIN,
      description: '用户登录',
      level: ActivityLevel.INFO,
      ipAddress,
      userAgent,
    });
  }

  // 记录文章创建
  async logArticleCreate(userId: string, familyId: string, articleId: string, articleTitle: string) {
    return this.create({
      userId,
      familyId,
      action: ActivityAction.ARTICLE_CREATE,
      description: `创建文章：${articleTitle}`,
      level: ActivityLevel.SUCCESS,
      metadata: {
        targetId: articleId,
        targetType: 'article',
        targetName: articleTitle,
      },
    });
  }

  // 记录文件上传
  async logFileUpload(userId: string, familyId: string, fileId: string, fileName: string, fileSize: number) {
    return this.create({
      userId,
      familyId,
      action: ActivityAction.FILE_UPLOAD,
      description: `上传文件：${fileName}`,
      level: ActivityLevel.SUCCESS,
      metadata: {
        targetId: fileId,
        targetType: 'file',
        targetName: fileName,
        fileSize,
      },
    });
  }

  // 记录成员角色变更
  async logMemberRoleChange(
    operatorId: string,
    familyId: string,
    targetUserId: string,
    targetUserName: string,
    oldRole: string,
    newRole: string,
  ) {
    return this.create({
      userId: operatorId,
      familyId,
      action: ActivityAction.MEMBER_ROLE_CHANGE,
      description: `将 ${targetUserName} 的角色从 ${oldRole} 变更为 ${newRole}`,
      level: ActivityLevel.WARNING,
      metadata: {
        targetId: targetUserId,
        targetType: 'user',
        targetName: targetUserName,
        oldValue: oldRole,
        newValue: newRole,
      },
    });
  }

  // 记录相册创建
  async logAlbumCreate(userId: string, familyId: string, albumId: string, albumTitle: string) {
    return this.create({
      userId,
      familyId,
      action: ActivityAction.ALBUM_CREATE,
      description: `创建相册：${albumTitle}`,
      level: ActivityLevel.SUCCESS,
      metadata: {
        targetId: albumId,
        targetType: 'album',
        targetName: albumTitle,
      },
    });
  }

  // 记录成员邀请
  async logMemberInvite(operatorId: string, familyId: string, invitedEmail: string) {
    return this.create({
      userId: operatorId,
      familyId,
      action: ActivityAction.MEMBER_INVITE,
      description: `邀请新成员：${invitedEmail}`,
      level: ActivityLevel.INFO,
      metadata: {
        invitedEmail,
      },
    });
  }

  // 清理旧日志（可定期执行）
  async cleanOldLogs(daysToKeep: number = 90): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.activityLogModel.deleteMany({
      createdAt: { $lt: cutoffDate },
    });

    return { deletedCount: result.deletedCount };
  }
}

