import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { TaskStatus } from './interfaces/ai-tool.interface';

/**
 * Wavespeed 任务管理服务
 * 负责查询和管理 Wavespeed API 的异步任务
 */
@Injectable()
export class WavespeedTaskService {
  private readonly logger = new Logger(WavespeedTaskService.name);
  private wavespeedClient: AxiosInstance | null = null;
  
  // 任务状态缓存，避免频繁查询
  private taskCache = new Map<string, { status: TaskStatus; timestamp: number }>();
  private readonly CACHE_TTL = 5000; // 5秒缓存

  constructor(private configService: ConfigService) {
    this.initialize();
  }

  private initialize() {
    const wavespeedKey = this.configService.get<string>('WAVESPEED_API_KEY');
    if (wavespeedKey) {
      this.wavespeedClient = axios.create({
        baseURL: this.configService.get<string>('WAVESPEED_API_URL') || 'https://api.wavespeed.ai/v1',
        timeout: 30000, // 30秒
        headers: {
          'Authorization': `Bearer ${wavespeedKey}`,
        },
      });
      this.logger.log('Wavespeed 任务服务已初始化');
    }
  }

  /**
   * 检查服务是否已配置
   */
  isConfigured(): boolean {
    return this.wavespeedClient !== null;
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    if (!this.wavespeedClient) {
      throw new Error('Wavespeed 服务未配置');
    }

    // 检查缓存
    const cached = this.taskCache.get(taskId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug(`从缓存返回任务状态: ${taskId}`);
      return cached.status;
    }

    try {
      this.logger.log(`查询任务状态: ${taskId}`);
      
      const response = await this.wavespeedClient.get(`/tasks/${taskId}`);
      const data = response.data;

      // 解析任务状态
      const status: TaskStatus = {
        taskId,
        status: this.parseStatus(data.status),
        progress: data.progress || 0,
        message: data.message || this.getStatusMessage(data.status),
        result: data.result,
        error: data.error,
        createdAt: data.created_at ? new Date(data.created_at) : new Date(),
        updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
      };

      // 缓存结果
      this.taskCache.set(taskId, { status, timestamp: Date.now() });

      return status;
    } catch (error: any) {
      this.logger.error(`获取任务状态失败: ${taskId}`, error.message);
      
      // 如果有缓存，返回缓存
      if (cached) {
        this.logger.warn(`API 调用失败，返回缓存状态: ${taskId}`);
        return cached.status;
      }

      throw new Error(`获取任务状态失败: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 批量获取任务状态
   */
  async getTaskStatuses(taskIds: string[]): Promise<TaskStatus[]> {
    const statuses = await Promise.allSettled(
      taskIds.map((id) => this.getTaskStatus(id)),
    );

    return statuses.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        this.logger.warn(`获取任务 ${taskIds[index]} 状态失败:`, result.reason);
        return {
          taskId: taskIds[index],
          status: 'failed',
          message: '获取状态失败',
          error: result.reason.message,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as TaskStatus;
      }
    });
  }

  /**
   * 等待任务完成
   * @param taskId 任务ID
   * @param maxWaitTime 最大等待时间(毫秒)，默认5分钟
   * @param pollInterval 轮询间隔(毫秒)，默认3秒
   */
  async waitForCompletion(
    taskId: string,
    maxWaitTime: number = 300000,
    pollInterval: number = 3000,
  ): Promise<TaskStatus> {
    const startTime = Date.now();
    
    while (true) {
      const status = await this.getTaskStatus(taskId);

      // 任务完成或失败
      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      // 超时
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error(`任务超时: ${taskId}`);
      }

      // 等待下一次轮询
      await this.sleep(pollInterval);
    }
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<void> {
    if (!this.wavespeedClient) {
      throw new Error('Wavespeed 服务未配置');
    }

    try {
      this.logger.log(`取消任务: ${taskId}`);
      await this.wavespeedClient.delete(`/tasks/${taskId}`);
      
      // 清除缓存
      this.taskCache.delete(taskId);
    } catch (error: any) {
      this.logger.error(`取消任务失败: ${taskId}`, error.message);
      throw new Error(`取消任务失败: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 清除缓存
   */
  clearCache(taskId?: string): void {
    if (taskId) {
      this.taskCache.delete(taskId);
      this.logger.debug(`清除任务缓存: ${taskId}`);
    } else {
      this.taskCache.clear();
      this.logger.debug('清除所有任务缓存');
    }
  }

  /**
   * 清理过期缓存
   */
  cleanupExpiredCache(): void {
    const now = Date.now();
    const expired: string[] = [];

    this.taskCache.forEach((value, key) => {
      if (now - value.timestamp > this.CACHE_TTL) {
        expired.push(key);
      }
    });

    expired.forEach((key) => this.taskCache.delete(key));
    
    if (expired.length > 0) {
      this.logger.debug(`清理 ${expired.length} 个过期缓存`);
    }
  }

  /**
   * 解析 API 返回的状态
   */
  private parseStatus(apiStatus: string): TaskStatus['status'] {
    const statusMap: Record<string, TaskStatus['status']> = {
      pending: 'pending',
      queued: 'pending',
      processing: 'processing',
      running: 'processing',
      completed: 'completed',
      succeeded: 'completed',
      success: 'completed',
      failed: 'failed',
      error: 'failed',
      cancelled: 'failed',
    };

    return statusMap[apiStatus?.toLowerCase()] || 'processing';
  }

  /**
   * 获取状态描述消息
   */
  private getStatusMessage(apiStatus: string): string {
    const messageMap: Record<string, string> = {
      pending: '任务排队中...',
      queued: '任务排队中...',
      processing: '任务处理中...',
      running: '任务处理中...',
      completed: '任务已完成',
      succeeded: '任务已完成',
      success: '任务已完成',
      failed: '任务失败',
      error: '任务出错',
      cancelled: '任务已取消',
    };

    return messageMap[apiStatus?.toLowerCase()] || '任务处理中...';
  }

  /**
   * 等待指定时间
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

