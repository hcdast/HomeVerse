import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, AiProviderType, AiProviderInfo, GenerateOptions } from './interfaces/ai-provider.interface';
import { OpenAiProvider } from './providers/openai.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { QwenProvider } from './providers/qwen.provider';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private providers: Map<AiProviderType, AiProvider> = new Map();
  private currentProviderType: AiProviderType;
  private providerInfoCache: AiProviderInfo[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 60000; // 1分钟缓存

  constructor(
    private configService: ConfigService,
    private openAiProvider: OpenAiProvider,
    private claudeProvider: ClaudeProvider,
    private geminiProvider: GeminiProvider,
    private qwenProvider: QwenProvider,
  ) {
    // 注册所有提供商
    this.providers.set(AiProviderType.OPENAI, openAiProvider);
    this.providers.set(AiProviderType.CLAUDE, claudeProvider);
    this.providers.set(AiProviderType.GEMINI, geminiProvider);
    this.providers.set(AiProviderType.QWEN, qwenProvider);

    // 设置默认提供商
    const defaultProvider = this.configService.get<string>('DEFAULT_AI_PROVIDER') || 'openai';
    this.currentProviderType = defaultProvider as AiProviderType;

    this.logger.log(`AI 服务已初始化，当前提供商: ${this.getCurrentProvider().getName()}`);
    this.logConfiguredProviders();
  }

  // 获取当前提供商
  private getCurrentProvider(): AiProvider {
    const provider = this.providers.get(this.currentProviderType);
    if (!provider) {
      throw new BadRequestException(`未知的 AI 提供商: ${this.currentProviderType}`);
    }
    return provider;
  }

  // 切换提供商
  setProvider(providerType: AiProviderType): void {
    if (!this.providers.has(providerType)) {
      throw new BadRequestException(`未知的 AI 提供商: ${providerType}`);
    }
    
    const provider = this.providers.get(providerType)!;
    if (!provider.isConfigured()) {
      throw new BadRequestException(
        `${provider.getName()} 未配置，请先在环境变量中设置 API Key`
      );
    }
    
    this.currentProviderType = providerType;
    this.logger.log(`已切换到提供商: ${provider.getName()}`);
    this.invalidateCache();
  }

  // 获取当前提供商类型
  getCurrentProviderType(): AiProviderType {
    return this.currentProviderType;
  }

  // 获取所有提供商信息（带缓存）
  getAllProviders(): AiProviderInfo[] {
    const now = Date.now();
    
    // 检查缓存是否有效
    if (this.providerInfoCache && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.providerInfoCache;
    }

    const providersInfo: AiProviderInfo[] = [];

    this.providers.forEach((provider, type) => {
      providersInfo.push({
        type,
        name: provider.getName(),
        description: this.getProviderDescription(type),
        configured: provider.isConfigured(),
        models: provider.getAvailableModels(),
        defaultModel: provider.getAvailableModels()[0],
      });
    });

    // 更新缓存
    this.providerInfoCache = providersInfo;
    this.cacheTimestamp = now;

    return providersInfo;
  }
  
  // 使缓存失效
  private invalidateCache(): void {
    this.providerInfoCache = null;
    this.cacheTimestamp = 0;
  }

  // 获取提供商描述
  private getProviderDescription(type: AiProviderType): string {
    const descriptions = {
      [AiProviderType.OPENAI]: 'OpenAI GPT 系列模型，强大的通用 AI 能力',
      [AiProviderType.CLAUDE]: 'Anthropic Claude 系列模型，擅长长文本理解和生成',
      [AiProviderType.GEMINI]: 'Google Gemini 系列模型，多模态 AI 能力',
      [AiProviderType.QWEN]: '阿里巴巴通义千问，中文理解能力强',
      [AiProviderType.CUSTOM]: '自定义 AI 提供商',
    };
    return descriptions[type] || '未知提供商';
  }

  // 检查当前提供商是否配置
  isConfigured(): boolean {
    return this.getCurrentProvider().isConfigured();
  }

  // 生成文章内容
  async generateArticleContent(
    prompt: string,
    options?: GenerateOptions & { provider?: AiProviderType },
  ): Promise<string> {
    const provider = options?.provider 
      ? this.providers.get(options.provider)!
      : this.getCurrentProvider();

    if (!provider.isConfigured()) {
      throw new BadRequestException(
        `${provider.getName()} 未配置，请设置相应的 API Key`,
      );
    }

    return provider.generateArticleContent(prompt, options);
  }

  // 生成文章标题
  async generateArticleTitle(
    topic: string,
    provider?: AiProviderType,
  ): Promise<string> {
    const aiProvider = provider 
      ? this.providers.get(provider)!
      : this.getCurrentProvider();

    if (!aiProvider.isConfigured()) {
      throw new BadRequestException(
        `${aiProvider.getName()} 未配置，请设置相应的 API Key`,
      );
    }

    return aiProvider.generateArticleTitle(topic);
  }

  // 生成文章摘要
  async generateArticleExcerpt(
    content: string,
    provider?: AiProviderType,
  ): Promise<string> {
    const aiProvider = provider 
      ? this.providers.get(provider)!
      : this.getCurrentProvider();

    if (!aiProvider.isConfigured()) {
      throw new BadRequestException(
        `${aiProvider.getName()} 未配置，请设置相应的 API Key`,
      );
    }

    return aiProvider.generateArticleExcerpt(content);
  }

  // 优化文章内容
  async optimizeArticleContent(
    content: string,
    instruction?: string,
    provider?: AiProviderType,
  ): Promise<string> {
    const aiProvider = provider 
      ? this.providers.get(provider)!
      : this.getCurrentProvider();

    if (!aiProvider.isConfigured()) {
      throw new BadRequestException(
        `${aiProvider.getName()} 未配置，请设置相应的 API Key`,
      );
    }

    return aiProvider.optimizeArticleContent(content, instruction);
  }

  // 获取可用模型列表
  getAvailableModels(provider?: AiProviderType): string[] {
    const aiProvider = provider 
      ? this.providers.get(provider)!
      : this.getCurrentProvider();

    return aiProvider.getAvailableModels();
  }

  // 设置模型
  setModel(model: string, provider?: AiProviderType): void {
    const aiProvider = provider 
      ? this.providers.get(provider)!
      : this.getCurrentProvider();

    aiProvider.setModel(model);
    this.logger.log(`已设置模型: ${model} (提供商: ${aiProvider.getName()})`);
  }
  
  // 记录已配置的提供商
  private logConfiguredProviders(): void {
    const configured: string[] = [];
    const notConfigured: string[] = [];
    
    this.providers.forEach((provider, type) => {
      if (provider.isConfigured()) {
        configured.push(provider.getName());
      } else {
        notConfigured.push(provider.getName());
      }
    });
    
    if (configured.length > 0) {
      this.logger.log(`已配置的提供商: ${configured.join(', ')}`);
    }
    
    if (notConfigured.length > 0) {
      this.logger.warn(`未配置的提供商: ${notConfigured.join(', ')}`);
    }
  }
  
  // 获取提供商统计信息
  getStatistics(): {
    total: number;
    configured: number;
    current: string;
  } {
    let configured = 0;
    this.providers.forEach((provider) => {
      if (provider.isConfigured()) configured++;
    });
    
    return {
      total: this.providers.size,
      configured,
      current: this.getCurrentProvider().getName(),
    };
  }
}
