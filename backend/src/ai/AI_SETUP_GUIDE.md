# AI 功能配置指南

## 快速开始

HomeVerse 支持多个 AI 提供商，您可以根据需求配置一个或多个提供商。

### 1. 配置环境变量

在 `backend` 目录下创建或编辑 `.env` 文件：

```bash
# 选择默认 AI 提供商
DEFAULT_AI_PROVIDER=openai

# 配置至少一个 AI 提供商的 API Key
OPENAI_API_KEY=your_api_key_here
```

### 2. 支持的 AI 提供商

#### OpenAI (推荐新手)
```bash
OPENAI_API_KEY=sk-xxxxx
OPENAI_MODEL=gpt-3.5-turbo  # 或 gpt-4
```
- 官网：https://platform.openai.com
- 优势：功能强大，社区支持好
- 注意：需要国际信用卡，部分地区需要代理

#### Claude (Anthropic)
```bash
CLAUDE_API_KEY=sk-ant-xxxxx
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```
- 官网：https://console.anthropic.com
- 优势：长文本理解能力强，输出质量高
- 注意：需要国际信用卡

#### Gemini (Google)
```bash
GEMINI_API_KEY=xxxxx
GEMINI_MODEL=gemini-pro
```
- 官网：https://makersuite.google.com/app/apikey
- 优势：免费额度较高，支持多模态
- 注意：部分地区需要代理

#### 通义千问 (阿里云) - 推荐国内用户
```bash
QWEN_API_KEY=sk-xxxxx
QWEN_MODEL=qwen-turbo
```
- 官网：https://dashscope.aliyun.com
- 优势：中文能力强，国内访问快，无需代理
- 注意：需要阿里云账号实名认证

### 3. 配置代理（可选）

如果您使用 OpenAI、Claude 等国际服务，可能需要配置代理：

```bash
HTTPS_PROXY=http://127.0.0.1:7890
HTTP_PROXY=http://127.0.0.1:7890
```

### 4. 重启服务

配置完成后，重启后端服务：

```bash
cd backend
npm run start:dev
```

查看启动日志，确认 AI 服务已初始化：
```
✅ OpenAI 客户端已初始化
✅ AI 服务已初始化，当前提供商: OpenAI
```

## 使用方式

### 在前端页面使用

1. **访问 AI 设置页面**
   - 点击导航栏的 "🤖 AI设置"
   - 查看所有已配置的 AI 提供商
   - 切换默认提供商

2. **在文章编辑中使用**
   - 创建或编辑文章时，点击 "🤖 AI助手"
   - 选择要使用的 AI 提供商
   - 输入提示词生成内容

3. **AI 功能**
   - ✨ 生成文章内容
   - ✨ 生成文章标题
   - ✨ 生成文章摘要
   - ✨ 优化文章内容

### 在不同场景选择提供商

- **写作创作**：OpenAI GPT-4, Claude Sonnet
- **快速生成**：OpenAI GPT-3.5, Qwen Turbo
- **中文内容**：通义千问 (Qwen)
- **长文本处理**：Claude Opus

## 常见问题

### Q1: API 连接超时怎么办？
**A:** 
1. 检查网络连接
2. 配置代理（HTTPS_PROXY）
3. 尝试其他提供商（如通义千问）

### Q2: 提示 "未配置" 怎么办？
**A:**
1. 检查 `.env` 文件中的 API Key
2. 确保 API Key 格式正确
3. 重启后端服务

### Q3: 如何获取 API Key？
**A:** 参考上面 "支持的 AI 提供商" 部分，访问对应官网注册获取

### Q4: 可以同时配置多个提供商吗？
**A:** 可以！配置多个提供商后，可以在使用时随时切换

### Q5: 哪个提供商最便宜？
**A:**
- 免费额度：Gemini > 通义千问 > OpenAI
- 付费价格：GPT-3.5 Turbo ≈ Qwen Turbo < Claude Haiku < GPT-4

### Q6: 国内用户推荐哪个？
**A:** 推荐通义千问（Qwen），无需代理，中文能力强

## 成本参考

以生成 1000 个 token 为例（约 750 个中文字）：

| 提供商 | 模型 | 大约成本 |
|--------|------|----------|
| OpenAI | GPT-3.5 Turbo | $0.002 |
| OpenAI | GPT-4 | $0.03 |
| Claude | Haiku | $0.00025 |
| Claude | Sonnet | $0.003 |
| Gemini | Pro | 免费额度 |
| 通义千问 | Turbo | ¥0.008 |

## 技术支持

如有问题，请查看：
- [AI 集成技术文档](./AI_INTEGRATION_GUIDE.md)
- [项目 README](./README.md)
- [GitHub Issues](https://github.com/hcdast/HomeVerse/issues)

## 安全提示

⚠️ **重要**：
- 不要将 API Key 提交到 Git 仓库
- 不要在前端代码中暴露 API Key
- 定期轮换 API Key
- 监控 API 使用量和费用

