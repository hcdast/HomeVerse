import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseAiProvider } from './base-ai-provider';
import { GenerateOptions } from '../interfaces/ai-provider.interface';

@Injectable()
export class GeminiProvider extends BaseAiProvider {
  private genAI: GoogleGenerativeAI | null = null;

  constructor(private configService: ConfigService) {
    super(configService.get<string>('GEMINI_MODEL') || 'gemini-pro');
    this.initialize();
  }

  private initialize() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      console.log('✅ Gemini 客户端已初始化');
    }
  }

  getName(): string {
    return 'Gemini';
  }

  isConfigured(): boolean {
    return this.genAI !== null;
  }

  getAvailableModels(): string[] {
    return [
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
    ];
  }

  async generateArticleContent(prompt: string, options?: GenerateOptions): Promise<string> {
    this.ensureConfigured();

    try {
      const model = this.genAI!.getGenerativeModel({ 
        model: options?.model || this.currentModel,
      });

      const fullPrompt = `你是一位专业的文章写作助手，擅长创作各种类型的文章。请根据以下要求，生成结构清晰、内容丰富的文章内容。使用 HTML 格式输出，支持标题、段落、列表等格式。\n\n${prompt}`;

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      this.handleError(error, 'AI 生成内容');
    }
  }

  async generateArticleTitle(topic: string): Promise<string> {
    this.ensureConfigured();

    try {
      const model = this.genAI!.getGenerativeModel({ model: this.currentModel });

      const prompt = `你是一位专业的文章标题创作助手。请根据用户提供的主题，生成一个吸引人、简洁明了的文章标题。只返回标题，不要包含其他内容。\n\n请为以下主题生成一个文章标题：${topic}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const title = response.text().trim();
      return title.replace(/^["']|["']$/g, '');
    } catch (error: any) {
      this.handleError(error, 'AI 生成标题');
    }
  }

  async generateArticleExcerpt(content: string): Promise<string> {
    this.ensureConfigured();

    try {
      const model = this.genAI!.getGenerativeModel({ model: this.currentModel });

      const prompt = `你是一位专业的文章摘要生成助手。请根据用户提供的文章内容，生成一个简洁明了的摘要（100-150字）。只返回摘要内容，不要包含其他说明。\n\n请为以下文章内容生成摘要：\n\n${content.substring(0, 2000)}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error: any) {
      this.handleError(error, 'AI 生成摘要');
    }
  }

  async optimizeArticleContent(content: string, instruction?: string): Promise<string> {
    this.ensureConfigured();

    try {
      const model = this.genAI!.getGenerativeModel({ model: this.currentModel });

      const systemPrompt = instruction
        ? `你是一位专业的文章编辑助手。请根据用户的要求优化文章内容：${instruction}`
        : '你是一位专业的文章编辑助手。请优化文章内容，使其更加流畅、清晰、有吸引力。保持原有的 HTML 格式。';

      const prompt = `${systemPrompt}\n\n请优化以下文章内容：\n\n${content}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      this.handleError(error, 'AI 优化内容');
    }
  }
}

