import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { AiToolProvider, AiToolType, AiToolParams, AiToolResult, ImageModel } from '../interfaces/ai-tool.interface';
import { ImageModelName, getModelConfig, getPricingConfig } from '../enums/wavespeed-models.enum';

@Injectable()
export class TextToImageTool implements AiToolProvider {
  private readonly logger = new Logger(TextToImageTool.name);
  private wavespeedClient: AxiosInstance | null = null;

  constructor(private configService: ConfigService) {
    this.initialize();
  }

  private initialize() {
    // 初始化 Wavespeed API 客户端
    const wavespeedKey = this.configService.get<string>('WAVESPEED_API_KEY');
    if (wavespeedKey) {
      this.wavespeedClient = axios.create({
        baseURL: this.configService.get<string>('WAVESPEED_API_URL') || 'https://api.wavespeed.ai/api/v3',
        timeout: 180000, // 3分钟
        headers: {
          'Authorization': `Bearer ${wavespeedKey}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.log('Wavespeed 文本生成图像工具已初始化');
      this.logger.log(`API Base URL: ${this.wavespeedClient.defaults.baseURL}`);
    }
  }

  getName(): string {
    return 'Text to Image';
  }

  getType(): AiToolType {
    return AiToolType.TEXT_TO_IMAGE;
  }

  isConfigured(): boolean {
    return this.wavespeedClient !== null;
  }

  async execute(params: AiToolParams): Promise<AiToolResult> {
    if (!params.prompt) {
      throw new Error('提示词不能为空');
    }

    // 检查配置
    if (!this.wavespeedClient) {
      throw new Error(
        '图像生成功能未配置。\n\n' +
        '请在 backend/.env 中配置：\n' +
        'WAVESPEED_API_KEY=your_api_key\n' +
        'WAVESPEED_API_URL=https://api.wavespeed.ai/v1\n\n' +
        '配置后重启后端服务'
      );
    }

    // 根据模型选择生成方法
    const modelName = params.model as ImageModelName || ImageModelName.FLUX_2_FLEX;
    
    try {
      switch (modelName) {
        case ImageModelName.FLUX_11_PRO_ULTRA:
        case ImageModelName.FLUX_2_PRO:
        case ImageModelName.FLUX_2_FLEX:
          return await this.generateWithFlux(params, modelName);
        
        case ImageModelName.SEEDREAM_4:
          return await this.generateWithSeeDream(params);
        
        default:
          return await this.generateWithFlux(params, ImageModelName.FLUX_2_FLEX);
      }
    } catch (error: any) {
      this.logger.error(`图像生成失败 (${modelName}):`, error.message);
      throw error;
    }
  }

  /**
   * 使用 Flux 系列模型生成图像
   */
  private async generateWithFlux(params: AiToolParams, modelName: ImageModelName): Promise<AiToolResult> {
    try {
      const startTime = Date.now();
      const config = getModelConfig(modelName);
      this.logger.log(`开始使用 ${config?.label} 生成图像: ${params.prompt?.substring(0, 50)}...`);

      // 构建请求数据
      const requestData: any = {
        prompt: params.prompt,
        model: modelName,
      };

      // 添加可选参数
      if (params.width && params.height) {
        requestData.size = `${params.width}*${params.height}`;
      } else if (params.aspectRatio) {
        requestData.aspect_ratio = params.aspectRatio;
      }

      if (params.seed !== undefined && params.seed >= 0) {
        requestData.seed = params.seed;
      }

      if (params.negativePrompt) {
        requestData.negative_prompt = params.negativePrompt;
      }

      if (params.steps) {
        requestData.num_inference_steps = params.steps;
      }

      if (params.guidanceScale) {
        requestData.guidance_scale = params.guidanceScale;
      }

      if (params.outputFormat) {
        requestData.output_format = params.outputFormat;
      }

      this.logger.log('请求参数:', JSON.stringify(requestData, null, 2));

      // 调用 API - 使用模型名作为路径
      // API 格式: https://api.wavespeed.ai/api/v3/{model_name}
      const apiPath = `/${modelName}`;
      this.logger.log(`完整 API 路径: ${this.wavespeedClient!.defaults.baseURL}${apiPath}`);
      
      const response = await this.wavespeedClient!.post(apiPath, requestData);
      const duration = Date.now() - startTime;

      this.logger.log('Wavespeed API 响应:', JSON.stringify(response.data, null, 2));

      // Wavespeed 返回异步任务
      if (response.data.code === 200 && response.data.data) {
        const taskData = response.data.data;
        const requestId = taskData.id;
        const resultUrl = taskData.urls?.get;
        
        this.logger.log(`✅ 异步任务已创建: ${requestId}`);
        this.logger.log(`结果获取URL: ${resultUrl}`);
        
        // 返回任务ID，前端需要轮询
        return {
          success: true,
          message: '图像生成任务已提交',
          data: {
            taskId: requestId,
            status: {
              taskId: requestId,
              status: taskData.status === 'created' ? 'processing' : taskData.status,
              progress: 0,
              message: '正在生成图像，请稍候...',
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

      // 如果直接返回了结果（某些模型可能同步）
      const imageUrl = response.data.image_url || 
                      response.data.url || 
                      response.data.data?.output || 
                      (response.data.data?.outputs && response.data.data.outputs[0]);

      if (imageUrl) {
        return {
          success: true,
          message: '图像生成成功',
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
      this.logger.error(`${modelName} 生成失败:`, error);
      throw new Error(
        `图像生成失败: ${error.response?.data?.message || error.message}\n` +
        `状态码: ${error.response?.status || '无'}`
      );
    }
  }

  // 获取任务结果（轮询用）
  async getTaskResult(requestId: string): Promise<any> {
    if (!this.wavespeedClient) {
      throw new Error('Wavespeed 未配置');
    }

    try {
      // 使用 Wavespeed 的结果查询接口
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

  /**
   * 使用 SeeDream 4.0 生成图像
   */
  private async generateWithSeeDream(params: AiToolParams): Promise<AiToolResult> {
    try {
      const startTime = Date.now();
      this.logger.log(`开始使用 SeeDream 4.0 生成图像: ${params.prompt?.substring(0, 50)}...`);

      // ByteDance SeeDream API 请求格式
      const requestData: any = {
        prompt: params.prompt,
        model: 'bytedance/seedream-v4',
      };

      // 添加尺寸参数
      if (params.width && params.height) {
        requestData.size = `${params.width}*${params.height}`;
      } else if (params.aspectRatio) {
        requestData.aspect_ratio = params.aspectRatio;
      } else {
        requestData.size = '2048*2048';
      }

      // 其他参数
      if (params.seed !== undefined && params.seed >= 0) {
        requestData.seed = params.seed;
      }

      if (params.steps) {
        requestData.num_inference_steps = params.steps;
      }

      this.logger.log('SeeDream 请求参数:', JSON.stringify(requestData, null, 2));

      // 调用 API - SeeDream 也使用模型名称作为路径
      const apiPath = '/bytedance/seedream-v4';
      this.logger.log(`SeeDream API 路径: ${this.wavespeedClient!.defaults.baseURL}${apiPath}`);
      
      const response = await this.wavespeedClient!.post(apiPath, requestData);
      const duration = Date.now() - startTime;
      
      this.logger.log('SeeDream API 响应:', JSON.stringify(response.data, null, 2));

      // 处理 Wavespeed 统一响应格式
      if (response.data.code === 200 && response.data.data) {
        const taskData = response.data.data;
        const requestId = taskData.id;
        const status = taskData.status;
        const outputs = taskData.outputs || [];
        
        this.logger.log(`SeeDream 任务状态: ${status}, 输出数量: ${outputs.length}`);
        
        // 如果已经完成（SeeDream 可能直接返回完成状态）
        if (status === 'completed' || status === 'succeeded') {
          if (outputs.length > 0) {
            this.logger.log(`✅ SeeDream 图像生成完成: ${outputs[0]}`);
            
            return {
              success: true,
              message: 'SeeDream 图像生成成功',
              data: {
                imageUrl: outputs[0],
                imageUrls: outputs,
              },
              metadata: {
                model: 'bytedance/seedream-v4',
                provider: 'ByteDance',
                duration,
              },
            };
          }
        }
        
        // 如果还在处理中或刚创建
        if (status === 'created' || status === 'processing' || status === 'pending') {
          this.logger.log(`SeeDream 异步任务: ${requestId}, 状态: ${status}`);
          
          return {
            success: true,
            message: 'SeeDream 图像生成任务已提交',
            data: {
              taskId: requestId,
              status: {
                taskId: requestId,
                status: 'processing',
                progress: 0,
                message: '正在生成图像...',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            },
            metadata: {
              model: 'bytedance/seedream-v4',
              provider: 'ByteDance',
              duration,
            },
          };
        }
      }

      // 无法识别的响应
      this.logger.error('SeeDream 响应格式无法识别:', response.data);
      throw new Error('SeeDream API 返回格式异常');
    } catch (error: any) {
      this.logger.error('SeeDream 生成失败:', error);
      throw new Error(
        `SeeDream 生成失败: ${error.response?.data?.message || error.message}\n` +
        `状态码: ${error.response?.status || '无'}`
      );
    }
  }

}
