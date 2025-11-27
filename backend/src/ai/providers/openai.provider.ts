import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { BaseAiProvider } from './base-ai-provider';
import { GenerateOptions } from '../interfaces/ai-provider.interface';

@Injectable()
export class OpenAiProvider extends BaseAiProvider {
  private openai: OpenAI | null = null;

  constructor(private configService: ConfigService) {
    super(configService.get<string>('OPENAI_MODEL') || 'gpt-3.5-turbo');
    this.initialize();
  }

  private initialize() {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      const config: any = {
        apiKey: apiKey,
        timeout: 60000,
        maxRetries: 2,
      };

      const httpProxy = this.configService.get<string>('HTTP_PROXY') || 
                       this.configService.get<string>('HTTPS_PROXY') ||
                       process.env.HTTP_PROXY ||
                       process.env.HTTPS_PROXY;
      
      if (httpProxy) {
        config.httpAgent = this.createHttpAgent(httpProxy);
        config.httpsAgent = config.httpAgent;
      }

      this.openai = new OpenAI(config);
      console.log('✅ OpenAI 客户端已初始化');
    }
  }

  private createHttpAgent(proxyUrl: string): any {
    try {
      const { HttpsProxyAgent } = require('https-proxy-agent');
      const agent = new HttpsProxyAgent(proxyUrl);
      console.log(`✅ OpenAI 已配置代理: ${proxyUrl}`);
      return agent;
    } catch (error) {
      console.warn('⚠️ https-proxy-agent 未安装，代理功能不可用');
      return undefined;
    }
  }

  getName(): string {
    return 'OpenAI';
  }

  isConfigured(): boolean {
    return this.openai !== null;
  }

  getAvailableModels(): string[] {
    return [
      'gpt-4',
      'gpt-4-turbo-preview',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
    ];
  }

  async generateArticleContent(prompt: string, options?: GenerateOptions): Promise<string> {
    this.ensureConfigured();

    try {
      const completion = await this.openai!.chat.completions.create({
        model: options?.model || this.currentModel,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的文章写作助手，擅长创作各种类型的文章。请根据用户的要求，生成结构清晰、内容丰富的文章内容。使用 HTML 格式输出，支持标题、段落、列表等格式。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: options?.maxTokens || 2000,
        temperature: options?.temperature || 0.7,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error: any) {
      this.handleError(error, 'AI 生成内容');
    }
  }

  async generateArticleTitle(topic: string): Promise<string> {
    this.ensureConfigured();

    try {
      const completion = await this.openai!.chat.completions.create({
        model: this.currentModel,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的文章标题创作助手。请根据用户提供的主题，生成一个吸引人、简洁明了的文章标题。只返回标题，不要包含其他内容。',
          },
          {
            role: 'user',
            content: `请为以下主题生成一个文章标题：${topic}`,
          },
        ],
        max_tokens: 50,
        temperature: 0.8,
      });

      const title = completion.choices[0]?.message?.content?.trim() || '';
      return title.replace(/^["']|["']$/g, '');
    } catch (error: any) {
      this.handleError(error, 'AI 生成标题');
    }
  }

  async generateArticleExcerpt(content: string): Promise<string> {
    this.ensureConfigured();

    try {
      const completion = await this.openai!.chat.completions.create({
        model: this.currentModel,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的文章摘要生成助手。请根据用户提供的文章内容，生成一个简洁明了的摘要（100-150字）。只返回摘要内容，不要包含其他说明。',
          },
          {
            role: 'user',
            content: `请为以下文章内容生成摘要：\n\n${content.substring(0, 2000)}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.5,
      });

      return completion.choices[0]?.message?.content?.trim() || '';
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

      const completion = await this.openai!.chat.completions.create({
        model: this.currentModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `请优化以下文章内容：\n\n${content}`,
          },
        ],
        max_tokens: 3000,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error: any) {
      this.handleError(error, 'AI 优化内容');
    }
  }
}

