// AI 提供商接口
export interface AiProvider {
  // 提供商名称
  getName(): string;

  // 检查是否已配置
  isConfigured(): boolean;

  // 生成文章内容
  generateArticleContent(
    prompt: string,
    options?: GenerateOptions,
  ): Promise<string>;

  // 生成文章标题
  generateArticleTitle(topic: string): Promise<string>;

  // 生成文章摘要
  generateArticleExcerpt(content: string): Promise<string>;

  // 优化文章内容
  optimizeArticleContent(
    content: string,
    instruction?: string,
  ): Promise<string>;

  // 获取可用模型列表
  getAvailableModels(): string[];

  // 设置当前使用的模型
  setModel(model: string): void;
}

// 生成选项
export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

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

