# OpenAI API 配置指南

## 📍 OPENAI_API_KEY 设置位置

在 `backend/.env` 文件中设置 `OPENAI_API_KEY`。

## 🔧 配置步骤

### 1. 创建或编辑 `.env` 文件

在 `backend` 目录下创建或编辑 `.env` 文件：

```env
# MongoDB 配置
MONGODB_URI=mongodb://username:password@localhost:27017/homeverse?authSource=admin

# JWT 配置
JWT_SECRET=your-secret-key-here-change-in-production

# 服务器端口
PORT=3001

# OpenAI API 配置
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-3.5-turbo

# 代理配置（可选，如果网络无法直接访问 OpenAI）
# HTTP_PROXY=http://proxy.example.com:8080
# HTTPS_PROXY=http://proxy.example.com:8080
```

### 2. 获取 OpenAI API Key

1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 注册/登录账号
3. 进入 **API Keys** 页面
4. 点击 **Create new secret key** 创建新的 API Key
5. 复制 API Key（格式类似：`sk-...`）
6. **重要**：API Key 只显示一次，请妥善保存

### 3. 配置 API Key

将复制的 API Key 粘贴到 `.env` 文件中：

```env
OPENAI_API_KEY=sk-你的实际API密钥
```

### 4. （可选）配置代理

如果您的网络环境无法直接访问 OpenAI API，可以配置代理：

```env
# HTTP 代理
HTTP_PROXY=http://proxy.example.com:8080

# HTTPS 代理
HTTPS_PROXY=http://proxy.example.com:8080

# 如果需要认证的代理
HTTPS_PROXY=http://username:password@proxy.example.com:8080
```

### 5. 重启后端服务

配置完成后，重启后端服务使配置生效：

```bash
cd backend
npm run start:dev
```

## ✅ 验证配置

### 方法 1：通过 API 检查

调用检查接口：

```bash
curl -X POST http://localhost:3001/ai/check \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

如果返回 `{"configured": true}`，说明配置成功。

### 方法 2：查看启动日志

启动后端服务时，如果看到以下日志，说明配置成功：

```
🚀 后端服务已启动，运行在 http://localhost:3001
📁 静态文件服务: http://localhost:3001/uploads
```

如果没有错误信息，说明 OpenAI 客户端已初始化。

## 🐛 常见问题

### 1. 连接超时错误 (ETIMEDOUT)

**错误信息：**
```
APIConnectionError: Connection error
code: 'ETIMEDOUT'
```

**解决方案：**

#### 方案 A：配置代理（推荐）

如果您在中国大陆，可能需要配置代理才能访问 OpenAI API：

```env
# 在 .env 文件中添加
HTTPS_PROXY=http://127.0.0.1:7890
```

或者使用其他代理服务：
```env
HTTPS_PROXY=http://proxy.example.com:8080
```

#### 方案 B：检查网络连接

1. 检查是否能访问 `https://api.openai.com`
2. 检查防火墙设置
3. 检查公司/学校网络是否阻止访问

#### 方案 C：使用 VPN

确保 VPN 已连接并可以访问 OpenAI API。

### 2. API Key 无效错误

**错误信息：**
```
status: 401
invalid_request_error
```

**解决方案：**

1. 检查 `.env` 文件中的 `OPENAI_API_KEY` 是否正确
2. 确保 API Key 没有多余的空格或引号
3. 重新生成 API Key 并更新配置

### 3. API 请求频率过高

**错误信息：**
```
status: 429
rate_limit_error
```

**解决方案：**

1. 等待一段时间后重试
2. 检查 OpenAI 账户的配额限制
3. 升级 OpenAI 账户计划

### 4. 代理配置不生效

**解决方案：**

1. 确保已安装 `https-proxy-agent`：
   ```bash
   npm install https-proxy-agent
   ```

2. 检查代理 URL 格式是否正确：
   ```env
   # 正确格式
   HTTPS_PROXY=http://127.0.0.1:7890
   
   # 错误格式（不要加引号）
   HTTPS_PROXY="http://127.0.0.1:7890"
   ```

3. 重启后端服务

## 📝 环境变量说明

| 变量名 | 必需 | 说明 | 示例 |
|--------|------|------|------|
| `OPENAI_API_KEY` | 是 | OpenAI API 密钥 | `sk-...` |
| `OPENAI_MODEL` | 否 | 使用的模型，默认为 `gpt-3.5-turbo` | `gpt-3.5-turbo` 或 `gpt-4` |
| `HTTP_PROXY` | 否 | HTTP 代理地址 | `http://127.0.0.1:7890` |
| `HTTPS_PROXY` | 否 | HTTPS 代理地址 | `http://127.0.0.1:7890` |

## 🔒 安全建议

1. **不要将 `.env` 文件提交到 Git**
   - 确保 `.env` 在 `.gitignore` 中
   - 使用 `.env.example` 作为模板

2. **定期更换 API Key**
   - 如果 API Key 泄露，立即在 OpenAI 平台撤销
   - 生成新的 API Key 并更新配置

3. **限制 API Key 权限**
   - 在 OpenAI 平台设置 API Key 的使用限制
   - 设置预算和配额限制

4. **监控 API 使用**
   - 定期检查 OpenAI 平台的使用情况
   - 设置使用警报

## 💡 提示

- 如果不使用 AI 功能，可以不配置 `OPENAI_API_KEY`，其他功能不受影响
- 代理配置是可选的，只有在网络无法直接访问 OpenAI 时才需要
- 建议使用 `gpt-3.5-turbo` 模型，性价比更高
- 生产环境建议使用 `gpt-4` 模型以获得更好的效果

## 📚 相关文档

- [OpenAI API 文档](https://platform.openai.com/docs)
- [OpenAI 定价](https://openai.com/pricing)
- [后端 README](./README.md)
- [AI 功能说明](./README_AI.md)

