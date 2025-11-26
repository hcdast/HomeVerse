# AI 功能配置说明

## 概述

HomeVerse 后端集成了 OpenAI API，支持使用 AI 大模型生成和优化文章内容。

## 功能特性

- ✨ **生成文章内容**：根据提示词生成完整的文章内容
- 📝 **生成文章标题**：根据文章主题自动生成吸引人的标题
- 📄 **生成文章摘要**：自动提取文章摘要
- 🔧 **优化文章内容**：优化现有文章，使其更加流畅清晰

## 配置步骤

### 1. 获取 OpenAI API Key

1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 注册/登录账号
3. 进入 API Keys 页面创建新的 API Key
4. 复制 API Key（格式类似：`sk-...`）

### 2. 配置环境变量

在 `backend/.env` 文件中添加以下配置：

```env
# OpenAI API 配置
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
```

**可选配置：**
- `OPENAI_MODEL`：使用的模型，默认为 `gpt-3.5-turbo`
  - 可选值：`gpt-3.5-turbo`、`gpt-4`、`gpt-4-turbo-preview` 等

### 3. 重启后端服务

配置完成后，重启后端服务使配置生效：

```bash
npm run start:dev
```

## API 接口

### 检查 AI 服务配置

```http
POST /ai/check
```

响应：
```json
{
  "configured": true
}
```

### 生成文章内容

```http
POST /ai/generate-content
Content-Type: application/json

{
  "prompt": "写一篇关于家庭旅行的文章",
  "maxTokens": 2000,
  "temperature": 0.7
}
```

响应：
```json
{
  "message": "内容生成成功",
  "content": "<h1>家庭旅行的美好时光</h1><p>...</p>"
}
```

### 生成文章标题

```http
POST /ai/generate-title
Content-Type: application/json

{
  "topic": "家庭旅行"
}
```

响应：
```json
{
  "message": "标题生成成功",
  "title": "探索世界，共享家庭旅行的美好时光"
}
```

### 生成文章摘要

```http
POST /ai/generate-excerpt
Content-Type: application/json

{
  "content": "<h1>文章标题</h1><p>文章内容...</p>"
}
```

响应：
```json
{
  "message": "摘要生成成功",
  "excerpt": "这是一篇关于..."
}
```

### 优化文章内容

```http
POST /ai/optimize-content
Content-Type: application/json

{
  "content": "<p>原始文章内容...</p>",
  "instruction": "使文章更加生动有趣"
}
```

响应：
```json
{
  "message": "内容优化成功",
  "content": "<p>优化后的文章内容...</p>"
}
```

## 使用说明

### 前端使用

在前端文章编辑页面，你可以：

1. **AI 生成内容**：点击 "AI助手" 按钮，输入提示词，AI 会生成文章内容
2. **AI 生成标题**：输入内容后，点击 "AI标题" 按钮自动生成标题
3. **AI 生成摘要**：输入内容后，点击 "AI摘要" 按钮自动生成摘要
4. **AI 优化内容**：点击 "优化" 按钮优化现有文章内容

### 注意事项

1. **API 费用**：使用 OpenAI API 会产生费用，请合理使用
2. **API 限制**：注意 OpenAI API 的速率限制和配额
3. **内容审核**：AI 生成的内容需要人工审核和编辑
4. **隐私保护**：文章内容会发送到 OpenAI API，请注意隐私保护

## 故障排除

### AI 功能不可用

1. 检查 `.env` 文件中是否配置了 `OPENAI_API_KEY`
2. 检查 API Key 是否有效
3. 检查网络连接是否正常
4. 查看后端日志中的错误信息

### 生成失败

1. 检查提示词是否为空
2. 检查 API Key 是否有足够的配额
3. 检查网络连接
4. 查看后端日志获取详细错误信息

## 安全建议

1. **不要将 API Key 提交到代码仓库**
2. **使用环境变量管理敏感信息**
3. **定期更换 API Key**
4. **监控 API 使用情况**
5. **设置 API 使用限额**

