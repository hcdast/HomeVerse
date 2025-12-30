import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as FormData from 'form-data';
import { AiToolProvider, AiToolType, AiToolParams, AiToolResult } from '../interfaces/ai-tool.interface';
import { VideoModelName, getModelConfig } from '../enums/wavespeed-models.enum';

@Injectable()
export class CharacterFaceswapTool implements AiToolProvider {
  private readonly logger = new Logger(CharacterFaceswapTool.name);
  private wavespeedClient: AxiosInstance | null = null;

  constructor(private configService: ConfigService) {
    this.initialize();
  }

  private initialize() {
    const wavespeedKey = this.configService.get<string>('WAVESPEED_API_KEY');
    if (wavespeedKey) {
      this.wavespeedClient = axios.create({
        baseURL: this.configService.get<string>('WAVESPEED_API_URL') || 'https://api.wavespeed.ai/api/v3',
        timeout: 300000, // 5分钟
        headers: {
          'Authorization': `Bearer ${wavespeedKey}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.log('角色换脸工具已初始化');
    }
  }

  getName(): string {
    return 'Character Faceswap';
  }

  getType(): AiToolType {
    return AiToolType.CHARACTER_FACESWAP;
  }

  isConfigured(): boolean {
    return this.wavespeedClient !== null;
  }

  async execute(params: AiToolParams): Promise<AiToolResult> {
    if (!this.isConfigured()) {
      throw new Error(
        '角色换脸功能未配置。\n\n' +
        '请在 backend/.env 中配置：\n' +
        'WAVESPEED_API_KEY=your_key\n' +
        'WAVESPEED_API_URL=https://api.wavespeed.ai/v1\n\n' +
        '配置后重启后端服务'
      );
    }

    // 验证必需参数
    if (!params.imageUrl && !params.imageFile) {
      throw new Error('需要提供角色图像');
    }

    if (!params.videoUrl && !params.videoFile) {
      throw new Error('需要提供源视频');
    }

    const modelName = (params.model as VideoModelName) || VideoModelName.WAN2_VIDEO_EDIT;
    const config = getModelConfig(modelName);

    if (!config) {
      throw new Error(`不支持的模型: ${modelName}`);
    }

    try {
      return await this.generateFaceswap(params, modelName);
    } catch (error: any) {
      this.logger.error(`角色换脸失败 (${modelName}):`, error.message);
      throw error;
    }
  }

  /**
   * 生成角色换脸视频
   */
  private async generateFaceswap(params: AiToolParams, modelName: VideoModelName): Promise<AiToolResult> {
    try {
      const startTime = Date.now();
      const config = getModelConfig(modelName);
      this.logger.log(`开始使用 ${config?.label} 进行角色换脸...`);

      const formData = new FormData();
      
      // 添加角色图像
      if (params.imageFile) {
        formData.append('image', params.imageFile.buffer, params.imageFile.originalname);
      } else if (params.imageUrl) {
        formData.append('image_url', params.imageUrl);
      }

      // 添加源视频
      if (params.videoFile) {
        formData.append('video', params.videoFile.buffer, params.videoFile.originalname);
      } else if (params.videoUrl) {
        formData.append('video_url', params.videoUrl);
      }

      // 添加必需参数
      formData.append('model', modelName);
      
      // 添加可选参数
      if (params.prompt) {
        formData.append('prompt', params.prompt);
      }
      if (params.resolution) {
        formData.append('resolution', params.resolution);
      } else {
        formData.append('resolution', '720p'); // 默认720p
      }
      if (params.mode) {
        formData.append('mode', params.mode);
      } else {
        formData.append('mode', 'animate'); // 默认动画模式
      }

      const response = await this.wavespeedClient!.post('/videos/character-faceswap', formData, {
        headers: formData.getHeaders(),
      });

      const duration = Date.now() - startTime;

      // 返回任务信息
      const taskId = response.data.task_id || response.data.id;
      return {
        success: true,
        message: '角色换脸任务已提交',
        data: {
          taskId,
          status: {
            taskId,
            status: 'processing',
            progress: 0,
            message: '正在处理角色换脸，预计需要 2-5 分钟...',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        metadata: {
          model: modelName,
          provider: config?.provider || 'Wavespeed',
          duration,
        },
      };
    } catch (error: any) {
      this.logger.error('角色换脸生成失败:', error);
      throw new Error(
        `角色换脸失败: ${error.response?.data?.message || error.message}\n` +
        `状态码: ${error.response?.status || '无'}`
      );
    }
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<any> {
    if (!this.wavespeedClient) {
      throw new Error('Wavespeed 未配置');
    }

    try {
      const resultUrl = `/predictions/${taskId}/result`;
      this.logger.log(`查询任务状态: ${resultUrl}`);
      
      const response = await this.wavespeedClient.get(resultUrl);
      
      this.logger.log(`Wavespeed 任务状态响应:`, JSON.stringify(response.data, null, 2));
      
      // Wavespeed API 响应格式: { code: 200, data: { status, outputs, ... } }
      const data = response.data.data || response.data;
      const status = data.status;
      const outputs = data.outputs || [];
      
      this.logger.log(`任务 ${taskId} 状态: ${status}, 输出数量: ${outputs.length}`);
      
      // 标准化返回格式
      return {
        taskId,
        status: status || 'processing',
        result: outputs.length > 0 ? {
          imageUrl: outputs[0],
          imageUrls: outputs,
        } : null,
        outputs,
        error: data.error || '',
        completed: status === 'succeeded' || status === 'completed',
      };
    } catch (error: any) {
      this.logger.error(`获取任务状态失败: ${taskId}`, error.message);
      this.logger.error('错误详情:', error.response?.data);
      throw new Error(`获取任务状态失败: ${error.message}`);
    }
  }
}

