import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AiTask, AiTaskDocument } from './schemas/ai-task.schema';
import { AiToolType } from './interfaces/ai-tool.interface';

@Injectable()
export class AiTaskService {
  private readonly logger = new Logger(AiTaskService.name);

  constructor(
    @InjectModel(AiTask.name) private aiTaskModel: Model<AiTaskDocument>,
  ) {}

  // 创建任务
  async createTask(data: {
    userId: string;
    familyId: string;
    toolType: AiToolType;
    params: any;
  }): Promise<AiTaskDocument> {
    const taskId = this.generateTaskId();

    const task = await this.aiTaskModel.create({
      taskId,
      userId: data.userId,
      familyId: data.familyId,
      toolType: data.toolType,
      status: 'pending',
      params: data.params,
      progress: 0,
      metadata: {},
    });

    this.logger.log(`任务已创建: ${taskId} (${data.toolType})`);
    return task;
  }

  // 更新远程任务ID
  async updateRemoteTaskId(taskId: string, remoteTaskId: string): Promise<void> {
    await this.aiTaskModel.findOneAndUpdate(
      { taskId },
      { remoteTaskId },
    );
    this.logger.log(`任务 ${taskId} 关联远程任务: ${remoteTaskId}`);
  }

  // 更新任务状态
  async updateTaskStatus(
    taskId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled',
    updates?: {
      progress?: number;
      result?: any;
      errorMessage?: string;
      metadata?: any;
    },
  ): Promise<AiTaskDocument> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (updates?.progress !== undefined) {
      updateData.progress = updates.progress;
    }

    if (updates?.result) {
      updateData.result = updates.result;
    }

    if (updates?.errorMessage) {
      updateData.errorMessage = updates.errorMessage;
    }

    if (updates?.metadata) {
      updateData.metadata = updates.metadata;
    }

    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    const task = await this.aiTaskModel.findOneAndUpdate(
      { taskId },
      updateData,
      { new: true },
    );

    if (!task) {
      throw new NotFoundException(`任务不存在: ${taskId}`);
    }

    this.logger.log(`任务状态已更新: ${taskId} -> ${status}`);
    return task;
  }

  // 获取任务详情
  async getTask(taskId: string): Promise<AiTaskDocument> {
    const task = await this.aiTaskModel.findOne({ taskId });
    
    if (!task) {
      throw new NotFoundException(`任务不存在: ${taskId}`);
    }

    return task;
  }

  // 获取用户的任务列表
  async getUserTasks(
    userId: string,
    filters?: {
      toolType?: AiToolType;
      status?: string;
      limit?: number;
    },
  ): Promise<AiTaskDocument[]> {
    const query: any = { userId };

    if (filters?.toolType) {
      query.toolType = filters.toolType;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    return this.aiTaskModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(filters?.limit || 50)
      .lean()
      .exec();
  }

  // 获取家庭的任务列表
  async getFamilyTasks(
    familyId: string,
    filters?: {
      toolType?: AiToolType;
      status?: string;
      limit?: number;
    },
  ): Promise<AiTaskDocument[]> {
    const query: any = { familyId };

    if (filters?.toolType) {
      query.toolType = filters.toolType;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    return this.aiTaskModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(filters?.limit || 100)
      .lean()
      .exec();
  }

  // 删除任务
  async deleteTask(taskId: string, userId: string): Promise<void> {
    const result = await this.aiTaskModel.findOneAndDelete({
      taskId,
      userId, // 只能删除自己的任务
    });

    if (!result) {
      throw new NotFoundException('任务不存在或无权删除');
    }

    this.logger.log(`任务已删除: ${taskId}`);
  }

  // 清理过期任务（30天前的已完成任务）
  async cleanupOldTasks(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.aiTaskModel.deleteMany({
      status: { $in: ['completed', 'failed', 'cancelled'] },
      createdAt: { $lt: thirtyDaysAgo },
    });

    this.logger.log(`已清理 ${result.deletedCount} 个过期任务`);
    return result.deletedCount;
  }

  // 生成任务ID
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  // 获取统计信息
  async getStatistics(userId: string): Promise<any> {
    const stats = await this.aiTaskModel.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$toolType',
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
          },
        },
      },
    ]);

    return stats;
  }
}

