import api from './api';

// AI 提供商类型
export enum AiProviderType {
  OPENAI = 'openai',
  CLAUDE = 'claude',
  GEMINI = 'gemini',
  QWEN = 'qwen',
  CUSTOM = 'custom',
}

// AI 提供商信息
export interface AiProviderInfo {
  type: AiProviderType;
  name: string;
  description: string;
  configured: boolean;
  models: string[];
  defaultModel: string;
}

// 生成选项
export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  provider?: AiProviderType;
  model?: string;
}

// 响应接口
export interface AiResponse {
  message: string;
  [key: string]: any;
}

class AiService {
  private providersCache: { providers: AiProviderInfo[]; current: AiProviderType } | null = null;
  private cacheTime: number = 0;
  private readonly CACHE_DURATION = 60000; // 1分钟缓存
  
  // 清除缓存
  private clearCache(): void {
    this.providersCache = null;
    this.cacheTime = 0;
  }
  
  // 统一的错误处理
  private handleError(error: any, operation: string): never {
    console.error(`${operation} 错误:`, error);
    
    const message = error.response?.data?.message || error.message || '操作失败';
    const status = error.response?.status;
    
    // 特殊错误处理
    if (status === 401) {
      throw new Error('未授权，请重新登录');
    } else if (status === 429) {
      throw new Error('请求过于频繁，请稍后再试');
    } else if (status === 503) {
      throw new Error('服务暂时不可用，请稍后重试');
    }
    
    throw new Error(message);
  }
  // 获取所有 AI 提供商（带缓存）
  async getProviders(): Promise<{ providers: AiProviderInfo[]; current: AiProviderType }> {
    const now = Date.now();
    
    // 检查缓存
    if (this.providersCache && (now - this.cacheTime) < this.CACHE_DURATION) {
      return this.providersCache;
    }
    
    try {
      const response = await api.get('/ai/providers');
      this.providersCache = response.data;
      this.cacheTime = now;
      return response.data;
    } catch (error) {
      this.handleError(error, '获取 AI 提供商列表');
    }
  }

  // 设置当前提供商
  async setProvider(provider: AiProviderType): Promise<void> {
    try {
      await api.post('/ai/provider', { provider });
      this.clearCache(); // 切换后清除缓存
    } catch (error) {
      this.handleError(error, '切换 AI 提供商');
    }
  }

  // 获取可用模型
  async getModels(provider?: AiProviderType): Promise<string[]> {
    try {
      const params = provider ? { provider } : {};
      const response = await api.get('/ai/models', { params });
      return response.data.models;
    } catch (error) {
      this.handleError(error, '获取模型列表');
    }
  }

  // 检查是否配置
  async checkConfigured(): Promise<{ configured: boolean; provider: AiProviderType }> {
    try {
      const response = await api.post('/ai/check');
      return response.data;
    } catch (error) {
      this.handleError(error, '检查配置状态');
    }
  }
  
  // 获取统计信息
  async getStatistics(): Promise<{ total: number; configured: number; current: string }> {
    try {
      const response = await api.get('/ai/statistics');
      return response.data;
    } catch (error) {
      this.handleError(error, '获取统计信息');
    }
  }

  // 生成文章内容
  async generateContent(prompt: string, options?: GenerateOptions): Promise<string> {
    try {
      // 输入验证
      if (!prompt || prompt.trim().length === 0) {
        throw new Error('提示词不能为空');
      }
      
      const response = await api.post('/ai/generate-content', {
        prompt: prompt.trim(),
        ...options,
      }, {
        timeout: 120000, // 2分钟超时
      });
      
      return response.data.content;
    } catch (error) {
      this.handleError(error, 'AI 生成内容');
    }
  }

  // 生成文章标题
  async generateTitle(topic: string, provider?: AiProviderType): Promise<string> {
    try {
      if (!topic || topic.trim().length === 0) {
        throw new Error('主题不能为空');
      }
      
      const response = await api.post('/ai/generate-title', {
        topic: topic.trim(),
        provider,
      }, {
        timeout: 60000, // 1分钟超时
      });
      
      return response.data.title;
    } catch (error) {
      this.handleError(error, 'AI 生成标题');
    }
  }

  // 生成文章摘要
  async generateExcerpt(content: string, provider?: AiProviderType): Promise<string> {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error('内容不能为空');
      }
      
      const response = await api.post('/ai/generate-excerpt', {
        content: content.trim(),
        provider,
      }, {
        timeout: 60000, // 1分钟超时
      });
      
      return response.data.excerpt;
    } catch (error) {
      this.handleError(error, 'AI 生成摘要');
    }
  }

  // 优化文章内容
  async optimizeContent(
    content: string,
    instruction?: string,
    provider?: AiProviderType,
  ): Promise<string> {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error('内容不能为空');
      }
      
      const response = await api.post('/ai/optimize-content', {
        content: content.trim(),
        instruction: instruction?.trim(),
        provider,
      }, {
        timeout: 120000, // 2分钟超时
      });
      
      return response.data.content;
    } catch (error) {
      this.handleError(error, 'AI 优化内容');
    }
  }
}

export default new AiService();

