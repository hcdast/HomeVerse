import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { AiToolProvider, AiToolType, AiToolParams, AiToolResult } from '../interfaces/ai-tool.interface';
import { ImageModelName, getModelConfig } from '../enums/wavespeed-models.enum';

@Injectable()
export class ImageToImageTool implements AiToolProvider {
  private readonly logger = new Logger(ImageToImageTool.name);
  private wavespeedClient: AxiosInstance | null = null;

  constructor(private configService: ConfigService) {
    this.initialize();
  }

  private initialize() {
    const wavespeedKey = this.configService.get<string>('WAVESPEED_API_KEY');
    if (wavespeedKey) {
      this.wavespeedClient = axios.create({
        baseURL: this.configService.get<string>('WAVESPEED_API_URL') || 'https://api.wavespeed.ai/api/v3',
        timeout: 180000,
        headers: {
          'Authorization': `Bearer ${wavespeedKey}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.log('图像编辑工具已初始化');
    }
  }

  getName(): string {
    return 'Image to Image';
  }

  getType(): AiToolType {
    return AiToolType.IMAGE_TO_IMAGE;
  }

  isConfigured(): boolean {
    return this.wavespeedClient !== null;
  }

  async execute(params: AiToolParams): Promise<AiToolResult> {
    if (!this.isConfigured()) {
      throw new Error(
        '图像编辑功能未配置。\n\n' +
        '请在 backend/.env 中配置：\n' +
        'WAVESPEED_API_KEY=your_key\n' +
        'WAVESPEED_API_URL=https://api.wavespeed.ai/api/v3\n\n' +
        '配置后重启后端服务'
      );
    }

    if (!params.imageUrl) {
      throw new Error('需要提供源图像 URL');
    }

    const modelName = (params.model as ImageModelName) || ImageModelName.FLUX_KONTEXT_PRO;
    const config = getModelConfig(modelName);

    try {
      const startTime = Date.now();
      this.logger.log(`开始使用 ${config?.label || modelName} 编辑图像...`);

      // 构建请求数据（使用 JSON 格式，与 text-to-image 保持一致）
      const requestData: any = {
        model: modelName,
      };

      // 添加图像 URL（API 要求的属性名是 'image'）
      requestData.image = params.imageUrl;

      // 添加提示词
      if (params.prompt) {
        requestData.prompt = params.prompt;
      }

      // 添加可选参数
      if (params.negativePrompt) {
        requestData.negative_prompt = params.negativePrompt;
      }

      if (params.strength !== undefined) {
        requestData.strength = params.strength;
      }

      if (params.guidanceScale !== undefined) {
        requestData.guidance_scale = params.guidanceScale;
      }

      if (params.steps) {
        requestData.num_inference_steps = params.steps;
      }

      if (params.seed !== undefined && params.seed >= 0) {
        requestData.seed = params.seed;
      }

      if (params.aspectRatio) {
        requestData.aspect_ratio = params.aspectRatio;
      }

      if (params.width && params.height) {
        requestData.size = `${params.width}*${params.height}`;
      } else if (params.size) {
        requestData.size = params.size;
      }

      if (params.outputFormat) {
        requestData.output_format = params.outputFormat;
      }

      this.logger.log('请求参数:', JSON.stringify(requestData, null, 2));

      // 使用模型名作为 API 路径
      const apiPath = `/${modelName}`;
      this.logger.log(`完整 API 路径: ${this.wavespeedClient!.defaults.baseURL}${apiPath}`);

      const response = await this.wavespeedClient!.post(apiPath, requestData);
      const duration = Date.now() - startTime;

      this.logger.log('Wavespeed API 响应:', JSON.stringify(response.data, null, 2));

      // 处理异步任务
      if (response.data.code === 200 && response.data.data) {
        const taskData = response.data.data;
        const requestId = taskData.id;
        
        this.logger.log(`✅ 异步任务已创建: ${requestId}`);
        
        return {
          success: true,
          message: '图像编辑任务已提交',
          data: {
            taskId: requestId,
            status: {
              taskId: requestId,
              status: taskData.status === 'created' ? 'processing' : taskData.status,
              progress: 0,
              message: '正在编辑图像...',
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

      // 如果直接返回了结果
      const imageUrl = response.data.image_url || 
                      response.data.url || 
                      response.data.data?.output || 
                      (response.data.data?.outputs && response.data.data.outputs[0]);

      if (imageUrl) {
        return {
          success: true,
          message: '图像编辑成功',
          data: {
            imageUrl,
            imageUrls: [imageUrl],
          },
          metadata: {
            model: modelName,
            provider: config?.provider || 'Wavespeed',
            duration,
          },
        };
      }

      // 无法识别的响应格式
      this.logger.error('无法处理的响应格式:', response.data);
      throw new Error('API 返回格式异常，请联系技术支持');
    } catch (error: any) {
      this.logger.error('图像编辑失败:', error);
      this.logger.error('错误详情:', error.response?.data);
      throw new Error(`图像编辑失败: ${error.response?.data?.message || error.message}`);
    }
  }

  // 获取任务结果（轮询用）
  async getTaskResult(requestId: string): Promise<any> {
    if (!this.wavespeedClient) {
      throw new Error('Wavespeed 未配置');
    }

    try {
      const resultUrl = `/predictions/${requestId}/result`;
      this.logger.log(`查询 Wavespeed 任务结果: ${resultUrl}`);
      
      const response = await this.wavespeedClient.get(resultUrl);
      
      this.logger.log(`Wavespeed 响应:`, JSON.stringify(response.data, null, 2));
      
      const data = response.data.data || response.data;
      const status = data.status;
      const outputs = data.outputs || [];
      
      this.logger.log(`任务 ${requestId} 状态: ${status}, 输出数量: ${outputs.length}`);
      
      return {
        status: status || 'processing',
        outputs: outputs,
        error: data.error || '',
        completed: status === 'succeeded',
      };
    } catch (error: any) {
      this.logger.error(`获取任务结果失败: ${requestId}`);
      this.logger.error('错误:', error.response?.data || error.message);
      throw error;
    }
  }

  // 实现接口要求的 getTaskStatus
  async getTaskStatus(taskId: string): Promise<any> {
    try {
      const result = await this.getTaskResult(taskId);
      
      this.logger.log(`getTaskStatus 返回:`, {
        taskId,
        status: result.status,
        outputs: result.outputs,
        completed: result.completed,
      });
      
      return {
        taskId,
        status: result.status,
        result: result.outputs && result.outputs.length > 0 ? {
          imageUrl: result.outputs[0],
          imageUrls: result.outputs,
        } : null,
        error: result.error,
        completed: result.completed,
      };
    } catch (error: any) {
      this.logger.error('获取任务状态失败:', error.message);
      return {
        taskId,
        status: 'failed',
        error: error.message,
      };
    }
  }
}

