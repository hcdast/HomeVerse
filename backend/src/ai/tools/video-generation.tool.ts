import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { AiToolProvider, AiToolType, AiToolParams, AiToolResult, VideoModel } from '../interfaces/ai-tool.interface';
import { VideoModelName, getModelConfig } from '../enums/wavespeed-models.enum';

/**
 * 文本生成视频工具 (Text to Video)
 * 支持多种模型：SeeDance, Wan 2.5, Veo, Kling 等
 */
@Injectable()
export class VideoGenerationTool implements AiToolProvider {
  private readonly logger = new Logger(VideoGenerationTool.name);
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
      this.logger.log('文本生成视频工具已初始化');
    }
  }

  getName(): string {
    return 'Video Generation';
  }

  getType(): AiToolType {
    return AiToolType.TEXT_TO_VIDEO;
  }

  isConfigured(): boolean {
    return this.wavespeedClient !== null;
  }

  async execute(params: AiToolParams): Promise<AiToolResult> {
    if (!this.isConfigured()) {
      throw new Error(
        '视频生成功能未配置。\n\n' +
        '请在 backend/.env 中配置：\n' +
        'WAVESPEED_API_KEY=your_key\n' +
        'WAVESPEED_API_URL=https://api.wavespeed.ai/v1\n\n' +
        '配置后重启后端服务'
      );
    }

    // 根据模型选择方法
    const modelName = (params.model as VideoModelName) || VideoModelName.SEEDANCE_PRO_T2V_480P;
    const config = getModelConfig(modelName);

    if (!config) {
      throw new Error(`不支持的模型: ${modelName}`);
    }

    try {
      // 统一转换为小写进行比较
      const provider = config.provider?.toLowerCase();
      
      switch (provider) {
        case 'bytedance':
          return await this.generateWithSeeDance(params, modelName);
        
        case 'alibaba':
          return await this.generateWithWan(params, modelName);
        
        case 'google':
          return await this.generateWithVeo(params, modelName);
        
        // 以下提供商通过 Wavespeed API 代理，使用 SeeDance 通用方法
        case 'openai':
        case 'kuaishou':
        case 'minimax':
          return await this.generateWithSeeDance(params, modelName);
        
        default:
          // 默认尝试使用 SeeDance 方法（通过 Wavespeed API）
          return await this.generateWithSeeDance(params, modelName);
      }
    } catch (error: any) {
      this.logger.error(`视频生成失败 (${modelName}):`, error.message);
      throw error;
    }
  }

  /**
   * 使用 SeeDance 生成视频（通用方法，通过 Wavespeed API）
   */
  private async generateWithSeeDance(params: AiToolParams, modelName: VideoModelName): Promise<AiToolResult> {
    try {
      const startTime = Date.now();
      const config = getModelConfig(modelName);
      this.logger.log(`开始使用 ${config?.label} 生成视频: ${params.prompt?.substring(0, 50)}...`);

      // 解析模型名称，获取正确的 API 路径
      // 模型名称格式可能是 "seedance/seedance-1-0-pro-fast-251015/text-to-video"
      // 需要转换为 API 路径格式
      const modelPath = this.getModelApiPath(modelName);
      
      // 使用 JSON 格式（与图像 API 一致）
      const requestData: any = {
        prompt: params.prompt || '',
        duration: params.duration || 5,
      };
      
      // 添加可选参数
      if (params.resolution) {
        requestData.resolution = params.resolution;
      }
      if (params.aspectRatio) {
        requestData.aspect_ratio = params.aspectRatio;
      }
      if (params.fps || params.framepersecond) {
        requestData.fps = params.fps || params.framepersecond || 24;
      }
      if (params.cameraFixed !== undefined) {
        requestData.camera_fixed = params.cameraFixed;
      }
      if (params.seed !== undefined && params.seed >= 0) {
        requestData.seed = params.seed;
      }
      if (params.negativePrompt) {
        requestData.negative_prompt = params.negativePrompt;
      }

      this.logger.log('请求参数:', JSON.stringify(requestData, null, 2));

      // 使用解析后的 API 路径
      const apiPath = `/${modelPath}`;
      this.logger.log(`完整 API 路径: ${this.wavespeedClient!.defaults.baseURL}${apiPath}`);

      const response = await this.wavespeedClient!.post(apiPath, requestData);
      const duration = Date.now() - startTime;

      this.logger.log('Wavespeed API 响应:', JSON.stringify(response.data, null, 2));

      // 处理异步任务响应
      if (response.data.code === 200 && response.data.data) {
        const taskData = response.data.data;
        const taskId = taskData.id;
        
        this.logger.log(`✅ 视频任务已创建: ${taskId}`);
        
        return {
          success: true,
          message: '视频生成任务已提交',
          data: {
            taskId,
            status: {
              taskId,
              status: taskData.status === 'created' ? 'processing' : taskData.status,
              progress: 0,
              message: '正在生成视频，预计需要 1-3 分钟...',
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
      }

      // 直接返回的任务信息
      const taskId = response.data.task_id || response.data.id || response.data.data?.id;
      return {
        success: true,
        message: '视频生成任务已提交',
        data: {
          taskId,
          status: {
            taskId,
            status: 'processing',
            progress: 0,
            message: '正在生成视频，预计需要 1-3 分钟...',
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
      this.logger.error('视频生成失败:', error);
      this.logger.error('错误详情:', error.response?.data);
      throw new Error(`视频生成失败: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 使用 Wan 生成视频
   */
  private async generateWithWan(params: AiToolParams, modelName: VideoModelName): Promise<AiToolResult> {
    try {
      const startTime = Date.now();
      const config = getModelConfig(modelName);
      this.logger.log(`开始使用 ${config?.label} 生成视频...`);

      const modelPath = this.getModelApiPath(modelName);
      
      // 使用 JSON 格式
      const requestData: any = {
        prompt: params.prompt || '',
        duration: params.duration || 5,
      };
      
      // 添加可选参数
      if (params.resolution) {
        requestData.resolution = params.resolution;
      }
      if (params.negativePrompt) {
        requestData.negative_prompt = params.negativePrompt;
      }
      if (params.audio) {
        requestData.audio = params.audio;
      }
      if (params.enablePromptExpansion !== undefined) {
        requestData.enable_prompt_expansion = params.enablePromptExpansion;
      }
      if (params.seed !== undefined && params.seed >= 0) {
        requestData.seed = params.seed;
      }

      this.logger.log('Wan 请求参数:', JSON.stringify(requestData, null, 2));
      
      const apiPath = `/${modelPath}`;
      this.logger.log(`Wan API 路径: ${this.wavespeedClient!.defaults.baseURL}${apiPath}`);
      
      const response = await this.wavespeedClient!.post(apiPath, requestData);
      const duration = Date.now() - startTime;

      this.logger.log('Wan API 响应:', JSON.stringify(response.data, null, 2));

      // 处理响应
      if (response.data.code === 200 && response.data.data) {
        const taskData = response.data.data;
        const taskId = taskData.id;
        
        return {
          success: true,
          message: '视频生成任务已提交',
          data: {
            taskId,
            status: {
              taskId,
              status: taskData.status === 'created' ? 'processing' : taskData.status,
              progress: 0,
              message: '正在生成视频...',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          metadata: {
            model: modelName,
            provider: config?.provider || 'Alibaba',
            duration,
          },
        };
      }

      // 返回任务信息
      const taskId = response.data.task_id || response.data.id || response.data.data?.id;
      return {
        success: true,
        message: '视频生成任务已提交',
        data: {
          taskId,
          status: {
            taskId,
            status: 'processing',
            progress: 0,
            message: '正在生成视频...',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        metadata: {
          model: modelName,
          provider: config?.provider || 'Alibaba',
          duration,
        },
      };
    } catch (error: any) {
      this.logger.error('Wan 生成失败:', error);
      this.logger.error('错误详情:', error.response?.data);
      throw new Error(`Wan 生成失败: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 使用 Google Veo 生成视频
   */
  private async generateWithVeo(params: AiToolParams, modelName: VideoModelName): Promise<AiToolResult> {
    try {
      const startTime = Date.now();
      const config = getModelConfig(modelName);
      this.logger.log(`开始使用 ${config?.label} 生成视频...`);

      const modelPath = this.getModelApiPath(modelName);
      
      // 使用 JSON 格式
      const requestData: any = {
        prompt: params.prompt || '',
        duration: params.duration || 4,
      };
      
      // 添加可选参数
      if (params.resolution) {
        requestData.resolution = params.resolution;
      }
      if (params.aspectRatio) {
        requestData.aspect_ratio = params.aspectRatio;
      }
      if (params.generateAudio !== undefined) {
        requestData.generate_audio = params.generateAudio;
      }
      if (params.negativePrompt) {
        requestData.negative_prompt = params.negativePrompt;
      }
      if (params.seed !== undefined && params.seed >= 0) {
        requestData.seed = params.seed;
      }

      this.logger.log('Veo 请求参数:', JSON.stringify(requestData, null, 2));
      
      const apiPath = `/${modelPath}`;
      this.logger.log(`Veo API 路径: ${this.wavespeedClient!.defaults.baseURL}${apiPath}`);
      
      const response = await this.wavespeedClient!.post(apiPath, requestData);
      const duration = Date.now() - startTime;

      this.logger.log('Veo API 响应:', JSON.stringify(response.data, null, 2));

      // 处理响应
      if (response.data.code === 200 && response.data.data) {
        const taskData = response.data.data;
        const taskId = taskData.id;
        
        return {
          success: true,
          message: '视频生成任务已提交',
          data: {
            taskId,
            status: {
              taskId,
              status: taskData.status === 'created' ? 'processing' : taskData.status,
              progress: 0,
              message: '正在生成视频...',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          metadata: {
            model: modelName,
            provider: config?.provider || 'Google',
            duration,
          },
        };
      }

      // 返回任务信息
      const taskId = response.data.task_id || response.data.id || response.data.data?.id;
      return {
        success: true,
        message: '视频生成任务已提交',
        data: {
          taskId,
          status: {
            taskId,
            status: 'processing',
            progress: 0,
            message: '正在生成视频...',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        metadata: {
          model: modelName,
          provider: config?.provider || 'Google',
          duration,
        },
      };
    } catch (error: any) {
      this.logger.error('Veo 生成失败:', error);
      this.logger.error('错误详情:', error.response?.data);
      throw new Error(`Veo 生成失败: ${error.response?.data?.message || error.message}`);
    }
  }

  // 获取任务状态
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
          videoUrl: outputs[0],
          videoUrls: outputs,
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

  /**
   * 获取模型的正确 API 路径
   * Wavespeed API 格式: https://api.wavespeed.ai/api/v3/{provider}/{model-name}
   * 
   * 模型名称已经是正确的 API 路径格式，直接返回即可
   */
  private getModelApiPath(modelName: string): string {
    this.logger.log(`使用 API 路径: ${modelName}`);
    return modelName;
  }
}

