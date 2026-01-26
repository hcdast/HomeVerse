import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Goal, GoalDocument, GoalStatus, Milestone, GoalUpdate } from './schemas/goal.schema';

@Injectable()
export class GoalsService {
  private readonly logger = new Logger(GoalsService.name);

  constructor(
    @InjectModel(Goal.name) private goalModel: Model<GoalDocument>,
  ) {}

  // 创建目标
  async create(createDto: Partial<Goal>): Promise<GoalDocument> {
    const goal = new this.goalModel({
      ...createDto,
      status: GoalStatus.NOT_STARTED,
    });
    return goal.save();
  }

  // 获取家庭所有目标
  async findByFamily(
    familyId: string,
    userId: string,
    filters?: {
      status?: GoalStatus;
      category?: string;
    },
  ): Promise<GoalDocument[]> {
    const query: any = {
      familyId,
      $or: [
        { isPrivate: false },
        { isPrivate: true, createdBy: userId },
      ],
    };

    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.category) {
      query.category = filters.category;
    }

    return this.goalModel
      .find(query)
      .populate('createdBy', 'username avatar')
      .populate('participants', 'username avatar')
      .sort({ priority: -1, createdAt: -1 })
      .exec();
  }

  // 获取进行中的目标
  async getActiveGoals(familyId: string, userId: string): Promise<GoalDocument[]> {
    return this.goalModel
      .find({
        familyId,
        status: { $in: [GoalStatus.IN_PROGRESS, GoalStatus.NOT_STARTED] },
        $or: [
          { isPrivate: false },
          { isPrivate: true, createdBy: userId },
        ],
      })
      .populate('createdBy', 'username avatar')
      .populate('participants', 'username avatar')
      .sort({ priority: -1, targetDate: 1 })
      .exec();
  }

  // 获取单个目标
  async findById(id: string): Promise<GoalDocument> {
    const goal = await this.goalModel
      .findById(id)
      .populate('createdBy', 'username avatar')
      .populate('participants', 'username avatar')
      .populate('updates.userId', 'username avatar')
      .exec();
    if (!goal) {
      throw new NotFoundException('目标不存在');
    }
    return goal;
  }

  // 更新目标
  async update(id: string, updateDto: Partial<Goal>): Promise<GoalDocument> {
    const goal = await this.goalModel.findByIdAndUpdate(
      id,
      updateDto,
      { new: true },
    );
    if (!goal) {
      throw new NotFoundException('目标不存在');
    }
    return goal;
  }

  // 更新进度
  async updateProgress(
    id: string,
    userId: string,
    progressData: {
      progress?: number;
      currentValue?: number;
      content: string;
      images?: string[];
    },
  ): Promise<GoalDocument> {
    const goal = await this.goalModel.findById(id);
    if (!goal) {
      throw new NotFoundException('目标不存在');
    }

    // 更新进度值
    if (progressData.progress !== undefined) {
      goal.progress = Math.min(100, Math.max(0, progressData.progress));
    }
    if (progressData.currentValue !== undefined) {
      goal.currentValue = progressData.currentValue;
      // 如果有目标值，自动计算进度
      if (goal.targetValue) {
        goal.progress = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
      }
    }

    // 添加更新记录
    goal.updates.push({
      userId,
      content: progressData.content,
      progress: goal.progress,
      images: progressData.images || [],
      createdAt: new Date(),
    } as any);

    // 自动更新状态
    if (goal.status === GoalStatus.NOT_STARTED && goal.progress > 0) {
      goal.status = GoalStatus.IN_PROGRESS;
    }
    if (goal.progress >= 100) {
      goal.status = GoalStatus.COMPLETED;
      goal.completedDate = new Date();
    }

    return goal.save();
  }

  // 添加里程碑
  async addMilestone(id: string, milestone: Partial<Milestone>): Promise<GoalDocument> {
    const goal = await this.goalModel.findById(id);
    if (!goal) {
      throw new NotFoundException('目标不存在');
    }

    goal.milestones.push({
      ...milestone,
      isCompleted: false,
      progress: 0,
    } as any);

    return goal.save();
  }

  // 完成里程碑
  async completeMilestone(
    goalId: string,
    milestoneIndex: number,
  ): Promise<GoalDocument> {
    const goal = await this.goalModel.findById(goalId);
    if (!goal) {
      throw new NotFoundException('目标不存在');
    }

    if (milestoneIndex >= 0 && milestoneIndex < goal.milestones.length) {
      goal.milestones[milestoneIndex].isCompleted = true;
      goal.milestones[milestoneIndex].completedAt = new Date();
      goal.milestones[milestoneIndex].progress = 100;

      // 根据里程碑完成情况更新总进度
      const completedCount = goal.milestones.filter((m) => m.isCompleted).length;
      if (goal.milestones.length > 0) {
        goal.progress = Math.round((completedCount / goal.milestones.length) * 100);
      }

      // 更新状态
      if (goal.status === GoalStatus.NOT_STARTED) {
        goal.status = GoalStatus.IN_PROGRESS;
      }
      if (goal.progress >= 100) {
        goal.status = GoalStatus.COMPLETED;
        goal.completedDate = new Date();
      }
    }

    return goal.save();
  }

  // 删除里程碑
  async deleteMilestone(
    goalId: string,
    milestoneIndex: number,
  ): Promise<GoalDocument> {
    const goal = await this.goalModel.findById(goalId);
    if (!goal) {
      throw new NotFoundException('目标不存在');
    }

    if (milestoneIndex >= 0 && milestoneIndex < goal.milestones.length) {
      goal.milestones.splice(milestoneIndex, 1);
    }

    return goal.save();
  }

  // 更新状态
  async updateStatus(id: string, status: GoalStatus): Promise<GoalDocument> {
    const goal = await this.goalModel.findById(id);
    if (!goal) {
      throw new NotFoundException('目标不存在');
    }

    goal.status = status;
    if (status === GoalStatus.COMPLETED) {
      goal.progress = 100;
      goal.completedDate = new Date();
    }

    return goal.save();
  }

  // 添加参与者
  async addParticipant(goalId: string, userId: string): Promise<GoalDocument> {
    const goal = await this.goalModel.findById(goalId);
    if (!goal) {
      throw new NotFoundException('目标不存在');
    }

    if (!goal.participants.includes(userId as any)) {
      goal.participants.push(userId as any);
    }

    return goal.save();
  }

  // 移除参与者
  async removeParticipant(goalId: string, userId: string): Promise<GoalDocument> {
    const goal = await this.goalModel.findById(goalId);
    if (!goal) {
      throw new NotFoundException('目标不存在');
    }

    const index = goal.participants.indexOf(userId as any);
    if (index > -1) {
      goal.participants.splice(index, 1);
    }

    return goal.save();
  }

  // 删除目标
  async delete(id: string): Promise<void> {
    const result = await this.goalModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('目标不存在');
    }
  }

  // 获取统计
  async getStatistics(familyId: string): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    completionRate: number;
    byCategory: { category: string; count: number; completed: number }[];
    recentCompleted: GoalDocument[];
  }> {
    const [all, completed, inProgress, byCategory, recentCompleted] = await Promise.all([
      this.goalModel.countDocuments({ familyId }),
      this.goalModel.countDocuments({ familyId, status: GoalStatus.COMPLETED }),
      this.goalModel.countDocuments({ familyId, status: GoalStatus.IN_PROGRESS }),
      this.goalModel.aggregate([
        { $match: { familyId } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', GoalStatus.COMPLETED] }, 1, 0] },
            },
          },
        },
      ]),
      this.goalModel
        .find({ familyId, status: GoalStatus.COMPLETED })
        .sort({ completedDate: -1 })
        .limit(5)
        .populate('createdBy', 'username avatar')
        .exec(),
    ]);

    return {
      total: all,
      completed,
      inProgress,
      completionRate: all > 0 ? Math.round((completed / all) * 100) : 0,
      byCategory: byCategory.map((item) => ({
        category: item._id,
        count: item.count,
        completed: item.completed,
      })),
      recentCompleted,
    };
  }

  // 获取即将到期的目标
  async getUpcomingDeadlines(
    familyId: string,
    days: number = 7,
  ): Promise<GoalDocument[]> {
    const now = new Date();
    const deadline = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.goalModel
      .find({
        familyId,
        status: { $in: [GoalStatus.IN_PROGRESS, GoalStatus.NOT_STARTED] },
        targetDate: { $lte: deadline, $gte: now },
      })
      .populate('createdBy', 'username avatar')
      .sort({ targetDate: 1 })
      .exec();
  }
}


