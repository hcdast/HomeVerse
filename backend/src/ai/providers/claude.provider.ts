import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { BaseAiProvider } from './base-ai-provider';
import { GenerateOptions } from '../interfaces/ai-provider.interface';

@Injectable()
export class ClaudeProvider extends BaseAiProvider {
  private anthropic: Anthropic | null = null;

  constructor(private configService: ConfigService) {
    super(configService.get<string>('CLAUDE_MODEL') || 'claude-3-5-sonnet-20241022');
    this.initialize();
  }

  private initialize() {
    const apiKey = this.configService.get<string>('CLAUDE_API_KEY');
    if (apiKey) {
      this.anthropic = new Anthropic({
        apiKey: apiKey,
        timeout: 60000,
        maxRetries: 2,
      });
      console.log('✅ Claude 客户端已初始化');
    }
  }

  getName(): string {
    return 'Claude';
  }

  isConfigured(): boolean {
    return this.anthropic !== null;
  }

  getAvailableModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ];
  }

  async generateArticleContent(prompt: string, options?: GenerateOptions): Promise<string> {
    this.ensureConfigured();

    try {
      const message = await this.anthropic!.messages.create({
        model: options?.model || this.currentModel,
        max_tokens: options?.maxTokens || 2000,
        temperature: options?.temperature || 0.7,
        system: '你是一位专业的文章写作助手，擅长创作各种类型的文章。请根据用户的要求，生成结构清晰、内容丰富的文章内容。使用 HTML 格式输出，支持标题、段落、列表等格式。',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = message.content[0];
      return content.type === 'text' ? content.text : '';
    } catch (error: any) {
      this.handleError(error, 'AI 生成内容');
    }
  }

  async generateArticleTitle(topic: string): Promise<string> {
    this.ensureConfigured();

    try {
      const message = await this.anthropic!.messages.create({
        model: this.currentModel,
        max_tokens: 50,
        temperature: 0.8,
        system: '你是一位专业的文章标题创作助手。请根据用户提供的主题，生成一个吸引人、简洁明了的文章标题。只返回标题，不要包含其他内容。',
        messages: [
          {
            role: 'user',
            content: `请为以下主题生成一个文章标题：${topic}`,
          },
        ],
      });

      const content = message.content[0];
      const title = content.type === 'text' ? content.text.trim() : '';
      return title.replace(/^["']|["']$/g, '');
    } catch (error: any) {
      this.handleError(error, 'AI 生成标题');
    }
  }

  async generateArticleExcerpt(content: string): Promise<string> {
    this.ensureConfigured();

    try {
      const message = await this.anthropic!.messages.create({
        model: this.currentModel,
        max_tokens: 200,
        temperature: 0.5,
        system: '你是一位专业的文章摘要生成助手。请根据用户提供的文章内容，生成一个简洁明了的摘要（100-150字）。只返回摘要内容，不要包含其他说明。',
        messages: [
          {
            role: 'user',
            content: `请为以下文章内容生成摘要：\n\n${content.substring(0, 2000)}`,
          },
        ],
      });

      const excerptContent = message.content[0];
      return excerptContent.type === 'text' ? excerptContent.text.trim() : '';
    } catch (error: any) {
      this.handleError(error, 'AI 生成摘要');
    }
  }

  async optimizeArticleContent(content: string, instruction?: string): Promise<string> {
    this.ensureConfigured();

    try {
      const systemPrompt = instruction
        ? `你是一位专业的文章编辑助手。请根据用户的要求优化文章内容：${instruction}`
        : '你是一位专业的文章编辑助手。请优化文章内容，使其更加流畅、清晰、有吸引力。保持原有的 HTML 格式。';

      const message = await this.anthropic!.messages.create({
        model: this.currentModel,
        max_tokens: 3000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `请优化以下文章内容：\n\n${content}`,
          },
        ],
      });

      const optimizedContent = message.content[0];
      return optimizedContent.type === 'text' ? optimizedContent.text : '';
    } catch (error: any) {
      this.handleError(error, 'AI 优化内容');
    }
  }
}

