# HomeVerse AI 集成指南

## 概述

HomeVerse 现已支持多个 AI 提供商的集成，包括：
- **OpenAI** (GPT-3.5, GPT-4)
- **Claude** (Anthropic)
- **Gemini** (Google)
- **通义千问** (阿里云)

用户可以根据需求选择不同的 AI 提供商，并在使用时随时切换。

## 后端架构

### 1. 核心组件

#### AI 提供商接口 (`AiProvider`)
所有 AI 提供商都实现统一的接口：
```typescript
interface AiProvider {
  getName(): string;
  isConfigured(): boolean;
  generateArticleContent(prompt: string, options?: GenerateOptions): Promise<string>;
  generateArticleTitle(topic: string): Promise<string>;
  generateArticleExcerpt(content: string): Promise<string>;
  optimizeArticleContent(content: string, instruction?: string): Promise<string>;
  getAvailableModels(): string[];
  setModel(model: string): void;
}
```

#### 提供商实现
- `OpenAiProvider` - OpenAI GPT 系列
- `ClaudeProvider` - Anthropic Claude 系列
- `GeminiProvider` - Google Gemini 系列
- `QwenProvider` - 阿里云通义千问系列

#### AI 服务 (`AiService`)
统一管理所有 AI 提供商，提供：
- 提供商切换
- 模型选择
- 统一的 API 接口

### 2. 目录结构

```
backend/src/ai/
├── interfaces/
│   └── ai-provider.interface.ts    # AI 提供商接口定义
├── providers/
│   ├── base-ai-provider.ts         # 基础提供商类
│   ├── openai.provider.ts          # OpenAI 实现
│   ├── claude.provider.ts          # Claude 实现
│   ├── gemini.provider.ts          # Gemini 实现
│   └── qwen.provider.ts            # 通义千问实现
├── ai.controller.ts                # AI 控制器
├── ai.service.ts                   # AI 服务
└── ai.module.ts                    # AI 模块
```

### 3. API 端点

#### 获取所有提供商信息
```http
GET /api/ai/providers
```

响应：
```json
{
  "providers": [
    {
      "type": "openai",
      "name": "OpenAI",
      "description": "OpenAI GPT 系列模型",
      "configured": true,
      "models": ["gpt-4", "gpt-3.5-turbo"],
      "defaultModel": "gpt-3.5-turbo"
    }
  ],
  "current": "openai"
}
```

#### 切换提供商
```http
POST /api/ai/provider
Content-Type: application/json

{
  "provider": "claude"
}
```

#### 生成文章内容
```http
POST /api/ai/generate-content
Content-Type: application/json

{
  "prompt": "写一篇关于AI的文章",
  "provider": "openai",  // 可选，不指定则使用默认提供商
  "model": "gpt-4",      // 可选，不指定则使用默认模型
  "maxTokens": 2000,
  "temperature": 0.7
}
```

## 前端集成

### 1. AI 服务 (`aiService.ts`)

前端提供统一的 AI 服务接口：

```typescript
import aiService from '@/services/aiService';

// 获取所有提供商
const { providers, current } = await aiService.getProviders();

// 切换提供商
await aiService.setProvider('claude');

// 生成内容
const content = await aiService.generateContent('prompt', {
  provider: 'openai',
  model: 'gpt-4'
});
```

### 2. AI 提供商选择组件

#### 卡片模式
```tsx
<AiProviderSelector
  value={selectedProvider}
  onChange={setSelectedProvider}
/>
```

#### 紧凑模式（下拉框）
```tsx
<AiProviderSelector
  value={selectedProvider}
  onChange={setSelectedProvider}
  compact={true}
  showOnlyConfigured={true}
/>
```

### 3. 在文章编辑中使用

```tsx
import { AiProviderType } from '@/services/aiService';

const [selectedProvider, setSelectedProvider] = useState<AiProviderType>();

// 生成内容时指定提供商
const content = await aiService.generateContent(prompt, {
  provider: selectedProvider,
  maxTokens: 2000,
});
```

## 配置指南

### 1. 环境变量配置

在 `backend/.env` 文件中配置：

```bash
# 默认提供商
DEFAULT_AI_PROVIDER=openai

# OpenAI
OPENAI_API_KEY=sk-xxxxx
OPENAI_MODEL=gpt-3.5-turbo

# Claude
CLAUDE_API_KEY=sk-ant-xxxxx
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Gemini
GEMINI_API_KEY=xxxxx
GEMINI_MODEL=gemini-pro

# 通义千问
QWEN_API_KEY=sk-xxxxx
QWEN_MODEL=qwen-turbo

# 代理（可选）
HTTPS_PROXY=http://127.0.0.1:7890
```

### 2. 获取 API Key

#### OpenAI
1. 访问 https://platform.openai.com
2. 注册账号并登录
3. 进入 API Keys 页面创建新的 API Key

#### Claude (Anthropic)
1. 访问 https://console.anthropic.com
2. 注册账号并登录
3. 进入 API Keys 页面创建新的 API Key

#### Gemini (Google)
1. 访问 https://makersuite.google.com/app/apikey
2. 使用 Google 账号登录
3. 创建 API Key

#### 通义千问 (阿里云)
1. 访问 https://dashscope.aliyun.com
2. 注册阿里云账号并开通服务
3. 获取 API Key

### 3. 安装依赖

后端已自动安装所需依赖：
```bash
npm install @anthropic-ai/sdk @google/generative-ai axios
```

## 使用场景

### 1. 文章生成
- 根据提示词生成完整文章
- 自动生成文章标题
- 生成文章摘要
- 优化文章内容

### 2. 多提供商对比
可以使用不同的 AI 提供商生成内容，对比效果：
- OpenAI: 通用能力强，生成速度快
- Claude: 长文本理解好，输出质量高
- Gemini: 多模态能力，支持图片理解
- 通义千问: 中文理解能力强

### 3. 成本优化
根据任务复杂度选择合适的提供商和模型：
- 简单任务: gpt-3.5-turbo, qwen-turbo
- 复杂任务: gpt-4, claude-3-opus
- 中等任务: claude-3-sonnet, gemini-pro

## 扩展开发

### 添加新的 AI 提供商

1. 创建新的提供商类：

```typescript
// backend/src/ai/providers/custom.provider.ts
import { Injectable } from '@nestjs/common';
import { BaseAiProvider } from './base-ai-provider';

@Injectable()
export class CustomProvider extends BaseAiProvider {
  constructor(private configService: ConfigService) {
    super('default-model');
    this.initialize();
  }

  getName(): string {
    return 'Custom AI';
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  // 实现其他接口方法...
}
```

2. 在 `ai.module.ts` 中注册：

```typescript
providers: [
  AiService,
  OpenAiProvider,
  ClaudeProvider,
  GeminiProvider,
  QwenProvider,
  CustomProvider, // 添加新提供商
]
```

3. 在 `ai.service.ts` 中注入：

```typescript
constructor(
  private customProvider: CustomProvider,
) {
  this.providers.set(AiProviderType.CUSTOM, customProvider);
}
```

## 故障排查

### 1. API 连接超时
- 检查网络连接
- 配置代理：`HTTPS_PROXY=http://127.0.0.1:7890`
- 检查防火墙设置

### 2. API Key 无效
- 确认 API Key 正确
- 检查 API Key 是否有足够的配额
- 确认服务已开通

### 3. 提供商未配置
- 检查 `.env` 文件中的配置
- 重启后端服务
- 查看后端启动日志

## 最佳实践

1. **配置多个提供商**：避免单点故障
2. **设置合理的超时时间**：防止长时间等待
3. **错误处理**：提供友好的错误提示
4. **日志记录**：记录 API 调用情况
5. **成本控制**：监控 API 使用量

## 更新日志

### v1.0.0 (2024-11)
- ✅ 支持 OpenAI GPT 系列
- ✅ 支持 Claude 系列
- ✅ 支持 Gemini 系列
- ✅ 支持通义千问系列
- ✅ 统一的提供商接口
- ✅ 前端提供商选择器
- ✅ AI 设置页面

## 许可证

MIT License

