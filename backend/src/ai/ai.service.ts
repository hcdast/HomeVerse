import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private openai: OpenAI | null = null;

  constructor(private configService: ConfigService) {
    // 初始化 OpenAI 客户端
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      const config: any = {
        apiKey: apiKey,
        timeout: 60000, // 60秒超时
        maxRetries: 2, // 最多重试2次
      };

      // 如果配置了代理，使用代理
      const httpProxy = this.configService.get<string>('HTTP_PROXY') || 
                       this.configService.get<string>('HTTPS_PROXY') ||
                       process.env.HTTP_PROXY ||
                       process.env.HTTPS_PROXY;
      
      if (httpProxy) {
        config.httpAgent = this.createHttpAgent(httpProxy);
        config.httpsAgent = config.httpAgent; // 同时设置 httpsAgent
      } else {
        console.log('ℹ️ 未配置代理，如果遇到连接超时，请在 .env 中设置 HTTPS_PROXY');
      }

      this.openai = new OpenAI(config);
      console.log('✅ OpenAI 客户端已初始化');
    } else {
      console.log('⚠️ 未配置 OPENAI_API_KEY，AI 功能不可用');
    }
  }

  // 创建 HTTP Agent（用于代理）
  private createHttpAgent(proxyUrl: string): any {
    try {
      const { HttpsProxyAgent } = require('https-proxy-agent');
      const agent = new HttpsProxyAgent(proxyUrl);
      console.log(`✅ 已配置代理: ${proxyUrl}`);
      return agent;
    } catch (error) {
      console.warn('⚠️ https-proxy-agent 未安装，代理功能不可用。请运行: npm install https-proxy-agent');
      return undefined;
    }
  }

  // 检查 OpenAI 是否配置
  isConfigured(): boolean {
    return this.openai !== null;
  }

  // 生成文章内容
  async generateArticleContent(prompt: string, options?: {
    maxTokens?: number;
    temperature?: number;
  }): Promise<string> {
    if (!this.openai) {
      throw new BadRequestException('OpenAI API 未配置，请在环境变量中设置 OPENAI_API_KEY');
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-3.5-turbo',
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

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new BadRequestException('AI 生成内容失败');
      }

      return content;
    } catch (error: any) {
      console.error('OpenAI API 错误:', error);
      this.handleError(error, 'AI 生成内容');
    }
  }

  // 生成文章标题
  async generateArticleTitle(topic: string): Promise<string> {
    if (!this.openai) {
      throw new BadRequestException('OpenAI API 未配置');
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-3.5-turbo',
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

      const title = completion.choices[0]?.message?.content?.trim();
      if (!title) {
        throw new BadRequestException('AI 生成标题失败');
      }

      // 移除可能的引号
      return title.replace(/^["']|["']$/g, '');
    } catch (error: any) {
      console.error('OpenAI API 错误:', error);
      this.handleError(error, 'AI 生成标题');
    }
  }

  // 生成文章摘要
  async generateArticleExcerpt(content: string): Promise<string> {
    if (!this.openai) {
      throw new BadRequestException('OpenAI API 未配置');
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-3.5-turbo',
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

      const excerpt = completion.choices[0]?.message?.content?.trim();
      if (!excerpt) {
        throw new BadRequestException('AI 生成摘要失败');
      }

      return excerpt;
    } catch (error: any) {
      console.error('OpenAI API 错误:', error);
      this.handleError(error, 'AI 生成摘要');
    }
  }

  // 优化文章内容
  async optimizeArticleContent(content: string, instruction?: string): Promise<string> {
    if (!this.openai) {
      throw new BadRequestException('OpenAI API 未配置');
    }

    try {
      const systemPrompt = instruction
        ? `你是一位专业的文章编辑助手。请根据用户的要求优化文章内容：${instruction}`
        : '你是一位专业的文章编辑助手。请优化文章内容，使其更加流畅、清晰、有吸引力。保持原有的 HTML 格式。';

      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-3.5-turbo',
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

      const optimized = completion.choices[0]?.message?.content;
      if (!optimized) {
        throw new BadRequestException('AI 优化内容失败');
      }

      return optimized;
    } catch (error: any) {
      console.error('OpenAI API 错误:', error);
      this.handleError(error, 'AI 优化内容');
    }
  }

  // 统一错误处理
  private handleError(error: any, operation: string): never {
    // 递归检查错误链中的超时错误
    const checkTimeout = (err: any): boolean => {
      if (!err) return false;
      if (err.code === 'ETIMEDOUT') return true;
      if (err.message?.includes('timeout') || err.message?.includes('ETIMEDOUT')) return true;
      // 检查嵌套的 cause
      if (err.cause) return checkTimeout(err.cause);
      // 检查 AggregateError 的 errors 数组
      if (err.errors && Array.isArray(err.errors)) {
        return err.errors.some((e: any) => checkTimeout(e));
      }
      return false;
    };

    // 检查是否是连接超时错误
    if (checkTimeout(error)) {
      throw new BadRequestException(
        `${operation}失败：连接 OpenAI API 超时。\n\n` +
        `解决方案：\n` +
        `1. 检查网络连接是否正常\n` +
        `2. 在 backend/.env 文件中配置代理：\n` +
        `   HTTPS_PROXY=http://127.0.0.1:7890\n` +
        `   （根据您的代理端口调整）\n` +
        `3. 确保可以访问 https://api.openai.com\n` +
        `4. 如果使用 VPN，确保 VPN 已连接\n` +
        `5. 重启后端服务使配置生效`,
      );
    }
    
    // 检查是否是连接错误（APIConnectionError）
    if (error.name === 'APIConnectionError' || error.message?.includes('Connection error')) {
      // 进一步检查是否是超时导致的连接错误
      if (checkTimeout(error.cause)) {
        throw new BadRequestException(
          `${operation}失败：连接 OpenAI API 超时。\n\n` +
          `解决方案：\n` +
          `1. 在 backend/.env 文件中配置代理：\n` +
          `   HTTPS_PROXY=http://127.0.0.1:7890\n` +
          `2. 检查网络连接\n` +
          `3. 重启后端服务`,
        );
      }
      throw new BadRequestException(
        `${operation}失败：无法连接到 OpenAI API。\n\n` +
        `请检查：\n` +
        `1. 网络连接是否正常\n` +
        `2. 是否配置了代理（在 backend/.env 中设置 HTTPS_PROXY）\n` +
        `3. 防火墙是否阻止了连接\n` +
        `4. OpenAI API 服务是否可用`,
      );
    }
    
    // 检查是否是请求错误
    if (error.type === 'invalid_request_error') {
      throw new BadRequestException(
        `${operation}失败：请求参数错误 - ${error.message || '请检查 API Key 和请求参数'}`,
      );
    }
    
    // 检查 API Key 是否无效
    if (error.status === 401 || error.message?.includes('401')) {
      throw new BadRequestException(
        `${operation}失败：OpenAI API Key 无效。\n` +
        `请检查 .env 文件中的 OPENAI_API_KEY 配置是否正确`,
      );
    }
    
    // 检查频率限制
    if (error.status === 429 || error.message?.includes('429')) {
      throw new BadRequestException(
        `${operation}失败：API 请求频率过高，请稍后再试`,
      );
    }
    
    // 其他错误
    const errorMessage = error.message || error.cause?.message || '未知错误';
    throw new BadRequestException(
      `${operation}失败：${errorMessage}\n` +
      `请检查网络连接和 API 配置（.env 文件中的 OPENAI_API_KEY）`,
    );
  }
}

