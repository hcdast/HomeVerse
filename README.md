# HomeVerse - 家庭管理平台

HomeVerse 是一个现代化的家庭数字管理平台，为每个家庭打造专属的数字宇宙。我们致力于将家庭的珍贵记忆、重要文件和共享信息统一管理，让亲情在数字世界中温暖延续。

## 项目结构

```
HomeVerse/
├── backend/          # NestJS 后端服务
│   ├── src/
│   │   ├── auth/     # 认证模块
│   │   ├── users/    # 用户模块
│   │   ├── families/ # 家庭模块
│   │   ├── albums/   # 相册模块
│   │   ├── files/    # 文件模块
│   │   ├── articles/ # 文章模块
│   │   └── ai/       # AI 模块（多提供商支持）
│   └── package.json
├── frontend/         # React 前端应用
│   ├── src/
│   │   ├── components/ # 组件
│   │   ├── pages/      # 页面
│   │   ├── services/   # API 服务
│   │   └── store/      # 状态管理
│   └── package.json
└── README.md
```

## 技术栈

### 后端
- **框架**: NestJS + TypeScript
- **数据库**: MongoDB + Mongoose
- **认证**: JWT + Passport
- **文件上传**: Multer
- **AI 集成**: OpenAI, Claude, Gemini, 通义千问

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **路由**: React Router
- **状态管理**: Zustand
- **HTTP 客户端**: Axios

## 快速开始

### 前置要求

- Node.js >= 16.0.0
- MongoDB >= 4.4
- npm 或 yarn

### 5分钟快速体验

1. **克隆项目**
```bash
git clone https://github.com/hcdast/HomeVerse.git
cd HomeVerse
```

2. **启动后端**
```bash
cd backend
npm install
npm run start:dev
```

3. **初始化演示数据**（新窗口）
```bash
cd backend
npm run init-demo
```

4. **启动前端**（新窗口）
```bash
cd frontend
npm install
npm run dev
```

5. **访问应用**
- 打开浏览器访问：http://localhost:3000
- 使用演示账号登录：`owner@example.com` / `123456`
- 开始体验！

**演示账号**:
- Owner: owner@example.com / 123456 👑
- Admin: admin@example.com / 123456 🛡️
- Editor: editor@example.com / 123456 ✏️
- Member: member@example.com / 123456 👤

详细步骤请参考：[快速开始指南](./QUICK_START.md)

### 正式部署安装

1. **安装后端依赖**
```bash
cd backend
npm install
```

2. **配置后端环境变量**
```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件，配置 MongoDB 连接和 JWT 密钥
```

3. **启动 MongoDB**
```bash
# 确保 MongoDB 服务正在运行
# Windows: 启动 MongoDB 服务
# macOS/Linux: mongod
```

4. **启动后端服务**
```bash
cd backend
npm run start:dev
# 后端服务将在 http://localhost:3001 运行
```

5. **安装前端依赖**
```bash
cd frontend
npm install
```

6. **启动前端开发服务器**
```bash
npm run dev
# 前端应用将在 http://localhost:3000 运行
```

## 功能特性

### 核心功能

- ✅ **用户认证**: 注册、登录、JWT Token 认证
- ✅ **家庭管理**: 创建家庭、邀请成员、权限管理
- ✅ **相册管理**: 创建相册、上传照片、照片管理
- ✅ **文件存储**: 文件上传、下载、管理
- ✅ **文章管理**: 创建文章、编辑、发布、评论
- ✨ **AI 助手**: 多提供商 AI 支持（OpenAI, Claude, Gemini, 通义千问）
- 🔐 **成员权限**: 5种角色、精细化权限控制、自定义权限

### 🎉 新功能（v2.0）

- 🔔 **消息通知系统**: 实时通知、未读标记、通知中心
- 🔍 **全局搜索**: 搜索文章、文件、相册，支持高级筛选
- 📁 **文件夹管理**: 创建文件夹、文件移动、文件夹导航
- 💬 **评论增强**: 评论点赞、删除评论、评论回复
- 📊 **活动日志**: 操作记录、活动统计、安全审计

### 页面功能

- 🏠 **首页**: 数据统计、快捷操作、权限展示
- 📷 **相册**: 相册列表、创建相册、上传照片
- 📁 **文件**: 文件夹管理、文件上传下载、文件移动 ✨ NEW
- 📝 **文章**: 文章列表、创建文章、AI 辅助写作、评论互动 ✨ ENHANCED
- 👥 **成员管理**: 家庭成员管理、角色权限设置
- 🤖 **AI 设置**: AI 提供商配置和切换
- 🔔 **通知中心**: 消息通知、未读标记、通知管理 ✨ NEW
- 🔍 **搜索**: 全局搜索、高级筛选、热门标签 ✨ NEW
- 👤 **个人**: 用户资料管理

## API 接口

### 认证接口
- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录
- `POST /auth/refresh` - 刷新 Token

### 用户接口
- `GET /users/profile` - 获取用户资料
- `PUT /users/profile` - 更新用户资料
- `GET /users/family-members` - 获取家庭成员

### 相册接口
- `GET /albums` - 获取相册列表
- `POST /albums` - 创建相册
- `GET /albums/:id` - 获取相册详情
- `PUT /albums/:id` - 更新相册
- `DELETE /albums/:id` - 删除相册
- `POST /albums/:id/photos` - 上传照片
- `DELETE /albums/:id/photos/:photoId` - 删除照片

### 文件接口
- `GET /files` - 获取文件列表
- `POST /files/upload` - 上传文件
- `GET /files/download/:id` - 下载文件
- `DELETE /files/:id` - 删除文件
- `GET /files/storage-usage` - 获取存储使用情况

### 文章接口
- `GET /articles` - 获取文章列表
- `POST /articles` - 创建文章
- `GET /articles/:id` - 获取文章详情
- `PUT /articles/:id` - 更新文章
- `DELETE /articles/:id` - 删除文章
- `POST /articles/:id/like` - 点赞文章
- `POST /articles/:id/comment` - 评论文章

### AI 接口
- `GET /ai/providers` - 获取所有 AI 提供商
- `POST /ai/provider` - 切换 AI 提供商
- `GET /ai/models` - 获取可用模型列表
- `POST /ai/generate-content` - 生成文章内容
- `POST /ai/generate-title` - 生成文章标题
- `POST /ai/generate-excerpt` - 生成文章摘要
- `POST /ai/optimize-content` - 优化文章内容

### 通知接口 ✨ NEW
- `GET /notifications` - 获取通知列表
- `GET /notifications/unread-count` - 获取未读数量
- `PUT /notifications/:id/read` - 标记为已读
- `PUT /notifications/mark-all-read` - 全部标记为已读
- `DELETE /notifications/:id` - 删除通知

### 搜索接口 ✨ NEW
- `GET /search` - 全局搜索
- `GET /search/advanced` - 高级搜索
- `GET /search/tags/popular` - 获取热门标签

### 文件夹接口 ✨ NEW
- `GET /files/folders/structure` - 获取文件夹结构
- `GET /files/folders/contents` - 获取文件夹内容
- `POST /files/folders` - 创建文件夹
- `POST /files/:id/move` - 移动文件
- `DELETE /files/folders` - 删除文件夹
- `POST /files/folders/rename` - 重命名文件夹

### 活动日志接口 ✨ NEW
- `GET /activity-logs/family` - 获取家庭日志（管理员）
- `GET /activity-logs/my-logs` - 获取个人日志
- `GET /activity-logs/family/statistics` - 获取活动统计

## 开发说明

### 后端开发

```bash
cd backend

# 开发模式（热重载）
npm run start:dev

# 生产构建
npm run build

# 生产运行
npm run start:prod
```

### 前端开发

```bash
cd frontend

# 开发模式
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

## 环境变量配置

### 后端 (.env)
```env
# 基础配置
MONGODB_URI=mongodb://localhost:27017/homeverse
JWT_SECRET=your-secret-key-change-in-production
PORT=3001

# AI 配置（可选，至少配置一个）
DEFAULT_AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
CLAUDE_API_KEY=your_claude_api_key
GEMINI_API_KEY=your_gemini_api_key
QWEN_API_KEY=your_qwen_api_key

# 代理配置（如需访问国际 AI 服务）
# HTTPS_PROXY=http://127.0.0.1:7890
```

详细的 AI 配置说明请参考 [AI 配置指南](./AI_SETUP_GUIDE.md)

### 前端
前端通过 Vite 代理配置连接到后端，无需单独配置环境变量。

## 数据库设计

项目使用 MongoDB 存储数据，主要集合包括：

- **users**: 用户信息
- **families**: 家庭信息
- **albums**: 相册信息
- **files**: 文件信息
- **articles**: 文章信息

详细的数据模型设计请参考各模块的 Schema 文件。

## 注意事项

1. **文件上传**: 上传的文件存储在 `backend/uploads/` 目录下，请确保该目录存在且有写入权限
2. **JWT 密钥**: 生产环境请务必修改 JWT_SECRET 为强密钥
3. **CORS**: 后端已配置 CORS，允许前端跨域访问
4. **文件大小限制**: 照片上传限制 10MB，文件上传限制 50MB
5. **AI 功能**: AI 功能为可选功能，不配置也可正常使用其他功能

## AI 功能说明

HomeVerse 集成了多个 AI 提供商，支持以下功能：

### 支持的 AI 提供商
- **OpenAI** (GPT-3.5, GPT-4) - 通用能力强
- **Claude** (Anthropic) - 长文本理解好
- **Gemini** (Google) - 多模态能力
- **通义千问** (阿里云) - 中文能力强，国内推荐

### AI 功能
- ✨ 一键生成文章内容
- ✨ 智能生成文章标题
- ✨ 自动生成文章摘要
- ✨ 文章内容优化

### 成员权限功能
- 👑 5种角色：Owner, Admin, Editor, Viewer, Member
- 🔐 精细化权限控制（读取、写入、删除、管理）
- ⚙️ 自定义权限设置
- 👥 完整的成员管理功能
- 🔄 所有权转让机制

### 快速配置
1. 在 `backend/.env` 中配置至少一个 AI 提供商的 API Key（可选）
2. 重启后端服务
3. 运行 `npm run init-demo` 初始化演示数据
4. 使用演示账号登录体验

详细配置请参考：
- [快速开始](./QUICK_START.md) - 5分钟快速体验
- [家庭设置指南](./FAMILY_SETUP_GUIDE.md) - 成员管理使用
- [AI 配置指南](./AI_SETUP_GUIDE.md) - AI 功能配置

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
