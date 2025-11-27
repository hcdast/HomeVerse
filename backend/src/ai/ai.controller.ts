import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Query,
  BadRequestException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiProviderType } from './interfaces/ai-provider.interface';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  // 获取所有 AI 提供商信息
  @Get('providers')
  getAllProviders() {
    return {
      providers: this.aiService.getAllProviders(),
      current: this.aiService.getCurrentProviderType(),
    };
  }

  // 设置当前使用的提供商
  @Post('provider')
  @HttpCode(HttpStatus.OK)
  setProvider(@Body() body: { provider: AiProviderType }) {
    const { provider } = body;
    if (!provider) {
      throw new BadRequestException('提供商类型不能为空');
    }

    try {
      this.aiService.setProvider(provider);
      this.logger.log(`用户切换 AI 提供商: ${provider}`);
      return {
        message: '提供商切换成功',
        provider,
        success: true,
      };
    } catch (error) {
      this.logger.error(`切换提供商失败: ${error.message}`);
      throw error;
    }
  }
  
  // 获取 AI 服务统计信息
  @Get('statistics')
  getStatistics() {
    return this.aiService.getStatistics();
  }

  // 获取可用模型列表
  @Get('models')
  getModels(@Query('provider') provider?: AiProviderType) {
    return {
      models: this.aiService.getAvailableModels(provider),
    };
  }

  // 检查 AI 服务是否配置
  @Post('check')
  checkConfigured() {
    return {
      configured: this.aiService.isConfigured(),
      provider: this.aiService.getCurrentProviderType(),
    };
  }

  // 生成文章内容
  @Post('generate-content')
  async generateContent(
    @Body() body: { 
      prompt: string; 
      maxTokens?: number; 
      temperature?: number;
      provider?: AiProviderType;
      model?: string;
    },
  ) {
    const { prompt, maxTokens, temperature, provider, model } = body;
    
    // 输入验证
    if (!prompt || prompt.trim().length === 0) {
      throw new BadRequestException('提示词不能为空');
    }
    
    if (prompt.length > 10000) {
      throw new BadRequestException('提示词过长，请控制在 10000 字符以内');
    }
    
    if (maxTokens && (maxTokens < 10 || maxTokens > 4000)) {
      throw new BadRequestException('maxTokens 必须在 10-4000 之间');
    }
    
    if (temperature && (temperature < 0 || temperature > 2)) {
      throw new BadRequestException('temperature 必须在 0-2 之间');
    }

    const startTime = Date.now();
    try {
      const content = await this.aiService.generateArticleContent(prompt, {
        maxTokens,
        temperature,
        provider,
        model,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`生成内容成功 (用时: ${duration}ms, 提供商: ${provider || '默认'})`);

      return {
        message: '内容生成成功',
        content,
        provider: provider || this.aiService.getCurrentProviderType(),
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`生成内容失败 (用时: ${duration}ms): ${error.message}`);
      throw error;
    }
  }

  // 生成文章标题
  @Post('generate-title')
  async generateTitle(
    @Body() body: { 
      topic: string;
      provider?: AiProviderType;
    },
  ) {
    const { topic, provider } = body;
    
    if (!topic || topic.trim().length === 0) {
      throw new BadRequestException('主题不能为空');
    }
    
    if (topic.length > 500) {
      throw new BadRequestException('主题过长，请控制在 500 字符以内');
    }

    try {
      const title = await this.aiService.generateArticleTitle(topic, provider);
      this.logger.log(`生成标题成功 (提供商: ${provider || '默认'})`);
      
      return {
        message: '标题生成成功',
        title,
        provider: provider || this.aiService.getCurrentProviderType(),
      };
    } catch (error) {
      this.logger.error(`生成标题失败: ${error.message}`);
      throw error;
    }
  }

  // 生成文章摘要
  @Post('generate-excerpt')
  async generateExcerpt(
    @Body() body: { 
      content: string;
      provider?: AiProviderType;
    },
  ) {
    const { content, provider } = body;
    
    if (!content || content.trim().length === 0) {
      throw new BadRequestException('内容不能为空');
    }
    
    if (content.length < 50) {
      throw new BadRequestException('内容太短，至少需要 50 个字符');
    }

    try {
      const excerpt = await this.aiService.generateArticleExcerpt(content, provider);
      this.logger.log(`生成摘要成功 (内容长度: ${content.length}, 提供商: ${provider || '默认'})`);
      
      return {
        message: '摘要生成成功',
        excerpt,
        provider: provider || this.aiService.getCurrentProviderType(),
      };
    } catch (error) {
      this.logger.error(`生成摘要失败: ${error.message}`);
      throw error;
    }
  }

  // 优化文章内容
  @Post('optimize-content')
  async optimizeContent(
    @Body() body: { 
      content: string; 
      instruction?: string;
      provider?: AiProviderType;
    },
  ) {
    const { content, instruction, provider } = body;
    
    if (!content || content.trim().length === 0) {
      throw new BadRequestException('内容不能为空');
    }
    
    if (content.length > 20000) {
      throw new BadRequestException('内容过长，请控制在 20000 字符以内');
    }
    
    if (instruction && instruction.length > 500) {
      throw new BadRequestException('优化指令过长，请控制在 500 字符以内');
    }

    const startTime = Date.now();
    try {
      const optimized = await this.aiService.optimizeArticleContent(
        content,
        instruction,
        provider,
      );
      
      const duration = Date.now() - startTime;
      this.logger.log(`优化内容成功 (用时: ${duration}ms, 提供商: ${provider || '默认'})`);
      
      return {
        message: '内容优化成功',
        content: optimized,
        provider: provider || this.aiService.getCurrentProviderType(),
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`优化内容失败 (用时: ${duration}ms): ${error.message}`);
      throw error;
    }
  }
}
