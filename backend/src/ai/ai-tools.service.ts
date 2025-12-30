import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AiToolType, AiToolProvider, AiToolParams, AiToolResult } from './interfaces/ai-tool.interface';
import { ChatGptAgentTool } from './tools/chatgpt-agent.tool';
import { TextToImageTool } from './tools/text-to-image.tool';
import { ImageToImageTool } from './tools/image-to-image.tool';
import { VideoGenerationTool } from './tools/video-generation.tool';
import { ImageToVideoTool } from './tools/image-to-video.tool';
import { CharacterFaceswapTool } from './tools/character-faceswap.tool';
import { WavespeedTaskService } from './wavespeed-task.service';

@Injectable()
export class AiToolsService {
  private readonly logger = new Logger(AiToolsService.name);
  private tools: Map<AiToolType, AiToolProvider> = new Map();

  constructor(
    private chatGptAgentTool: ChatGptAgentTool,
    private textToImageTool: TextToImageTool,
    private imageToImageTool: ImageToImageTool,
    private videoGenerationTool: VideoGenerationTool,
    private imageToVideoTool: ImageToVideoTool,
    private characterFaceswapTool: CharacterFaceswapTool,
    private wavespeedTaskService: WavespeedTaskService,
  ) {
    // 注册所有工具
    this.tools.set(AiToolType.CHAT_AGENT, chatGptAgentTool);
    this.tools.set(AiToolType.TEXT_TO_IMAGE, textToImageTool);
    this.tools.set(AiToolType.IMAGE_TO_IMAGE, imageToImageTool);
    this.tools.set(AiToolType.TEXT_TO_VIDEO, videoGenerationTool);
    this.tools.set(AiToolType.IMAGE_TO_VIDEO, imageToVideoTool);
    this.tools.set(AiToolType.CHARACTER_FACESWAP, characterFaceswapTool);

    this.logger.log('AI 工具服务已初始化');
    this.logAvailableTools();
  }

  // 执行工具任务
  async executeTool(
    toolType: AiToolType,
    params: AiToolParams,
  ): Promise<AiToolResult> {
    const tool = this.tools.get(toolType);
    
    if (!tool) {
      throw new BadRequestException(`未知的工具类型: ${toolType}`);
    }

    if (!tool.isConfigured()) {
      throw new BadRequestException(`${tool.getName()} 未配置，请设置相应的 API Key`);
    }

    const startTime = Date.now();
    try {
      this.logger.log(`开始执行工具: ${tool.getName()}`);
      const result = await tool.execute(params);
      
      const duration = Date.now() - startTime;
      this.logger.log(`工具执行完成: ${tool.getName()} (用时: ${duration}ms)`);
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(`工具执行失败: ${tool.getName()} (用时: ${duration}ms) - ${error.message}`);
      throw error;
    }
  }

  // 获取任务状态（从 AI 服务提供商）
  async getTaskStatus(toolType: AiToolType, taskId: string): Promise<any> {
    const tool = this.tools.get(toolType);
    
    if (!tool) {
      throw new BadRequestException(`未知的工具类型: ${toolType}`);
    }

    if (!tool.getTaskStatus) {
      // 如果工具不支持状态查询，返回默认状态
      return {
        taskId,
        status: 'processing',
        message: '任务处理中...',
      };
    }

    try {
      const status = await tool.getTaskStatus(taskId);
      this.logger.log(`任务状态查询: ${taskId} -> ${status.status}`);
      return status;
    } catch (error: any) {
      this.logger.error(`任务状态查询失败: ${taskId}`, error.message);
      throw error;
    }
  }

  // 获取所有可用工具
  getAvailableTools(): any[] {
    const toolsList: any[] = [];

    this.tools.forEach((tool, type) => {
      toolsList.push({
        type,
        name: tool.getName(),
        configured: tool.isConfigured(),
        description: this.getToolDescription(type),
      });
    });

    return toolsList;
  }

  // 获取 Wavespeed 任务状态
  async getWavespeedTaskStatus(taskId: string): Promise<any> {
    return this.wavespeedTaskService.getTaskStatus(taskId);
  }

  // 等待 Wavespeed 任务完成
  async waitForWavespeedTask(taskId: string, maxWaitTime?: number): Promise<any> {
    return this.wavespeedTaskService.waitForCompletion(taskId, maxWaitTime);
  }

  // 取消 Wavespeed 任务
  async cancelWavespeedTask(taskId: string): Promise<void> {
    return this.wavespeedTaskService.cancelTask(taskId);
  }

  // 获取工具描述
  private getToolDescription(type: AiToolType): string {
    const descriptions = {
      [AiToolType.CHAT_AGENT]: 'ChatGPT 智能对话代理，支持函数调用',
      [AiToolType.TEXT_TO_IMAGE]: '文本生成图像 (Flux 2, SeeDream 4.0)',
      [AiToolType.IMAGE_TO_IMAGE]: '图像编辑和风格转换 (Flux Kontext, SeeDream)',
      [AiToolType.TEXT_TO_VIDEO]: '文本生成视频 (SeeDance, Wan 2.5)',
      [AiToolType.IMAGE_TO_VIDEO]: '图像生成视频动画 (SeeDance, Wan, Veo, Kling)',
      [AiToolType.CHARACTER_FACESWAP]: '角色换脸和动画 (Wan 2.2 Animate)',
      [AiToolType.VIDEO_TO_VIDEO]: '视频编辑和转换',
      [AiToolType.REFERENCE_TO_VIDEO]: '参考图生成视频',
    };
    return descriptions[type] || '未知工具';
  }

  // 记录可用工具
  private logAvailableTools(): void {
    const configured: string[] = [];
    const notConfigured: string[] = [];

    this.tools.forEach((tool) => {
      if (tool.isConfigured()) {
        configured.push(tool.getName());
      } else {
        notConfigured.push(tool.getName());
      }
    });

    if (configured.length > 0) {
      this.logger.log(`已配置的 AI 工具: ${configured.join(', ')}`);
    }

    if (notConfigured.length > 0) {
      this.logger.warn(`未配置的 AI 工具: ${notConfigured.join(', ')}`);
    }
  }

  // ChatGPT Agent 专用方法
  async createAgent(name: string, instructions: string, functions?: any[]): Promise<string> {
    return this.chatGptAgentTool.createAgent(name, instructions, functions);
  }

  async getAgent(agentId: string): Promise<any> {
    return this.chatGptAgentTool.getAgent(agentId);
  }

  async listAgents(): Promise<any[]> {
    return this.chatGptAgentTool.listAgents();
  }

  // 获取统计信息
  getStatistics(): any {
    let configured = 0;
    this.tools.forEach((tool) => {
      if (tool.isConfigured()) configured++;
    });

    return {
      total: this.tools.size,
      configured,
      tools: this.getAvailableTools(),
    };
  }
}

