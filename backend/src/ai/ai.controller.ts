import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // 检查 AI 服务是否配置
  @Post('check')
  checkConfigured() {
    return {
      configured: this.aiService.isConfigured(),
    };
  }

  // 生成文章内容
  @Post('generate-content')
  async generateContent(
    @Body() body: { prompt: string; maxTokens?: number; temperature?: number },
  ) {
    const { prompt, maxTokens, temperature } = body;
    if (!prompt || prompt.trim().length === 0) {
      throw new BadRequestException('提示词不能为空');
    }

    const content = await this.aiService.generateArticleContent(prompt, {
      maxTokens,
      temperature,
    });

    return {
      message: '内容生成成功',
      content,
    };
  }

  // 生成文章标题
  @Post('generate-title')
  async generateTitle(@Body() body: { topic: string }) {
    const { topic } = body;
    if (!topic || topic.trim().length === 0) {
      throw new BadRequestException('主题不能为空');
    }

    const title = await this.aiService.generateArticleTitle(topic);
    return {
      message: '标题生成成功',
      title,
    };
  }

  // 生成文章摘要
  @Post('generate-excerpt')
  async generateExcerpt(@Body() body: { content: string }) {
    const { content } = body;
    if (!content || content.trim().length === 0) {
      throw new BadRequestException('内容不能为空');
    }

    const excerpt = await this.aiService.generateArticleExcerpt(content);
    return {
      message: '摘要生成成功',
      excerpt,
    };
  }

  // 优化文章内容
  @Post('optimize-content')
  async optimizeContent(
    @Body() body: { content: string; instruction?: string },
  ) {
    const { content, instruction } = body;
    if (!content || content.trim().length === 0) {
      throw new BadRequestException('内容不能为空');
    }

    const optimized = await this.aiService.optimizeArticleContent(
      content,
      instruction,
    );
    return {
      message: '内容优化成功',
      content: optimized,
    };
  }
}

