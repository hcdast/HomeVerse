import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { BaseAiProvider } from './base-ai-provider';
import { GenerateOptions } from '../interfaces/ai-provider.interface';

@Injectable()
export class QwenProvider extends BaseAiProvider {
  private client: AxiosInstance | null = null;
  private apiKey: string | null = null;

  constructor(private configService: ConfigService) {
    super(configService.get<string>('QWEN_MODEL') || 'qwen-turbo');
    this.initialize();
  }

  private initialize() {
    const apiKey = this.configService.get<string>('QWEN_API_KEY');
    if (apiKey) {
      this.apiKey = apiKey;
      this.client = axios.create({
        baseURL: 'https://dashscope.aliyuncs.com/api/v1',
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      console.log('✅ 通义千问客户端已初始化');
    }
  }

  getName(): string {
    return '通义千问';
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  getAvailableModels(): string[] {
    return [
      'qwen-turbo',
      'qwen-plus',
      'qwen-max',
      'qwen-max-longcontext',
    ];
  }

  private async callQwenApi(messages: any[], options?: GenerateOptions): Promise<string> {
    this.ensureConfigured();

    try {
      const response = await this.client!.post('/services/aigc/text-generation/generation', {
        model: options?.model || this.currentModel,
        input: {
          messages: messages,
        },
        parameters: {
          max_tokens: options?.maxTokens || 2000,
          temperature: options?.temperature || 0.7,
        },
      });

      if (response.data.output && response.data.output.text) {
        return response.data.output.text;
      }

      throw new Error('通义千问 API 返回数据格式错误');
    } catch (error: any) {
      if (error.response) {
        // API 返回了错误响应
        const message = error.response.data?.message || error.message;
        throw new Error(`通义千问 API 错误: ${message}`);
      }
      throw error;
    }
  }

  async generateArticleContent(prompt: string, options?: GenerateOptions): Promise<string> {
    const messages = [
      {
        role: 'system',
        content: '你是一位专业的文章写作助手，擅长创作各种类型的文章。请根据用户的要求，生成结构清晰、内容丰富的文章内容。使用 HTML 格式输出，支持标题、段落、列表等格式。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    try {
      return await this.callQwenApi(messages, options);
    } catch (error: any) {
      this.handleError(error, 'AI 生成内容');
    }
  }

  async generateArticleTitle(topic: string): Promise<string> {
    const messages = [
      {
        role: 'system',
        content: '你是一位专业的文章标题创作助手。请根据用户提供的主题，生成一个吸引人、简洁明了的文章标题。只返回标题，不要包含其他内容。',
      },
      {
        role: 'user',
        content: `请为以下主题生成一个文章标题：${topic}`,
      },
    ];

    try {
      const title = await this.callQwenApi(messages, { maxTokens: 50, temperature: 0.8 });
      return title.trim().replace(/^["']|["']$/g, '');
    } catch (error: any) {
      this.handleError(error, 'AI 生成标题');
    }
  }

  async generateArticleExcerpt(content: string): Promise<string> {
    const messages = [
      {
        role: 'system',
        content: '你是一位专业的文章摘要生成助手。请根据用户提供的文章内容，生成一个简洁明了的摘要（100-150字）。只返回摘要内容，不要包含其他说明。',
      },
      {
        role: 'user',
        content: `请为以下文章内容生成摘要：\n\n${content.substring(0, 2000)}`,
      },
    ];

    try {
      const excerpt = await this.callQwenApi(messages, { maxTokens: 200, temperature: 0.5 });
      return excerpt.trim();
    } catch (error: any) {
      this.handleError(error, 'AI 生成摘要');
    }
  }

  async optimizeArticleContent(content: string, instruction?: string): Promise<string> {
    const systemPrompt = instruction
      ? `你是一位专业的文章编辑助手。请根据用户的要求优化文章内容：${instruction}`
      : '你是一位专业的文章编辑助手。请优化文章内容，使其更加流畅、清晰、有吸引力。保持原有的 HTML 格式。';

    const messages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `请优化以下文章内容：\n\n${content}`,
      },
    ];

    try {
      return await this.callQwenApi(messages, { maxTokens: 3000, temperature: 0.7 });
    } catch (error: any) {
      this.handleError(error, 'AI 优化内容');
    }
  }
}

