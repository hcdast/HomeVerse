import { BadRequestException } from '@nestjs/common';
import { AiProvider, GenerateOptions } from '../interfaces/ai-provider.interface';

// AI 提供商基类
export abstract class BaseAiProvider implements AiProvider {
  protected currentModel: string;

  constructor(protected readonly defaultModel: string) {
    this.currentModel = defaultModel;
  }

  abstract getName(): string;
  abstract isConfigured(): boolean;
  abstract generateArticleContent(prompt: string, options?: GenerateOptions): Promise<string>;
  abstract generateArticleTitle(topic: string): Promise<string>;
  abstract generateArticleExcerpt(content: string): Promise<string>;
  abstract optimizeArticleContent(content: string, instruction?: string): Promise<string>;
  abstract getAvailableModels(): string[];

  setModel(model: string): void {
    const availableModels = this.getAvailableModels();
    if (!availableModels.includes(model)) {
      throw new BadRequestException(
        `模型 ${model} 不可用。可用模型: ${availableModels.join(', ')}`,
      );
    }
    this.currentModel = model;
  }

  protected ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        `${this.getName()} API 未配置，请在环境变量中设置相应的 API Key`,
      );
    }
  }

  protected handleError(error: any, operation: string): never {
    console.error(`${this.getName()} API 错误:`, error);

    // 超时错误
    if (this.isTimeoutError(error)) {
      throw new BadRequestException(
        `${operation}失败：连接 ${this.getName()} API 超时。\n` +
        `请检查网络连接或配置代理（HTTPS_PROXY）`,
      );
    }

    // 连接错误
    if (this.isConnectionError(error)) {
      throw new BadRequestException(
        `${operation}失败：无法连接到 ${this.getName()} API。\n` +
        `请检查网络连接和防火墙设置`,
      );
    }

    // 认证错误
    if (error.status === 401 || error.message?.includes('401')) {
      throw new BadRequestException(
        `${operation}失败：API Key 无效。\n` +
        `请检查环境变量中的 API Key 配置`,
      );
    }

    // 频率限制
    if (error.status === 429 || error.message?.includes('429')) {
      throw new BadRequestException(
        `${operation}失败：API 请求频率过高，请稍后再试`,
      );
    }

    // 其他错误
    const errorMessage = error.message || error.cause?.message || '未知错误';
    throw new BadRequestException(
      `${operation}失败：${errorMessage}`,
    );
  }

  private isTimeoutError(error: any): boolean {
    if (!error) return false;
    if (error.code === 'ETIMEDOUT') return true;
    if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) return true;
    if (error.cause) return this.isTimeoutError(error.cause);
    if (error.errors && Array.isArray(error.errors)) {
      return error.errors.some((e: any) => this.isTimeoutError(e));
    }
    return false;
  }

  private isConnectionError(error: any): boolean {
    return error.name === 'APIConnectionError' || 
           error.message?.includes('Connection error') ||
           error.code === 'ECONNREFUSED' ||
           error.code === 'ENOTFOUND';
  }
}

