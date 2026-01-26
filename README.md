# HomeVerse - 家庭管理平台

HomeVerse 是一个现代化的家庭数字管理平台，为每个家庭打造专属的数字宇宙。我们致力于将家庭的珍贵记忆、重要文件和共享信息统一管理，让亲情在数字世界中温暖延续。

## 📋 目录

- [项目结构](#项目结构)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [功能特性](#功能特性)
- [API 接口](#api-接口)
- [数据库设计](#数据库设计)
- [环境变量配置](#环境变量配置)
- [开发说明](#开发说明)
- [部署指南](#部署指南)
- [注意事项](#注意事项)

## 项目结构

```
HomeVerse/
├── backend/                    # NestJS 后端服务
│   ├── src/
│   │   ├── auth/              # 认证模块
│   │   ├── users/             # 用户模块
│   │   ├── families/          # 家庭模块
│   │   ├── albums/            # 相册模块
│   │   ├── files/             # 文件模块
│   │   ├── articles/          # 文章模块
│   │   ├── ai/                # AI 模块（多提供商支持 + AI 工具）
│   │   ├── calendar/          # 日历模块（含万年历）
│   │   ├── finance/           # 财务模块
│   │   ├── recipes/           # 食谱模块
│   │   ├── todos/             # 待办事项模块
│   │   ├── health/            # 健康记录模块
│   │   ├── growth/            # 成长记录模块
│   │   ├── wiki/              # Wiki 知识库模块
│   │   ├── passwords/         # 密码管理模块
│   │   ├── notifications/     # 通知模块
│   │   ├── search/            # 搜索模块
│   │   ├── activity-logs/     # 活动日志模块
│   │   ├── storage/           # MinIO 对象存储模块
│   │   ├── mail/              # 邮件模块
│   │   ├── common/            # 公共模块（守卫、装饰器、拦截器）
│   │   └── database/          # 数据库模块
│   └── package.json
├── frontend/                   # React 前端应用
│   ├── src/
│   │   ├── components/        # 通用组件
│   │   ├── pages/             # 页面组件
│   │   ├── hooks/             # 自定义 Hooks
│   │   ├── services/          # API 服务
│   │   ├── store/             # 状态管理 (Zustand)
│   │   └── utils/             # 工具函数
│   └── package.json
├── nginx.conf                  # Nginx 配置
├── deploy.sh                   # 部署脚本
└── README.md
```

## 技术栈

### 后端
| 技术 | 版本 | 说明 |
|------|------|------|
| NestJS | ^10.0.0 | Node.js 后端框架 |
| TypeScript | ^5.1.3 | 类型安全 |
| MongoDB | - | NoSQL 数据库 |
| Mongoose | ^7.5.0 | MongoDB ODM |
| Passport | ^0.6.0 | 认证中间件 |
| JWT | - | Token 认证 |
| Multer | ^1.4.5 | 文件上传 |
| MinIO | ^8.0.6 | 对象存储 |
| OpenAI SDK | ^6.9.1 | AI 集成 |
| Anthropic SDK | ^0.71.0 | Claude AI |
| Google Generative AI | ^0.24.1 | Gemini AI |
| Nodemailer | ^7.0.11 | 邮件发送 |

### 前端
| 技术 | 版本 | 说明 |
|------|------|------|
| React | ^18.2.0 | UI 框架 |
| TypeScript | ^5.0.2 | 类型安全 |
| Vite | ^4.4.5 | 构建工具 |
| React Router | ^6.15.0 | 路由管理 |
| Zustand | ^4.4.1 | 状态管理 |
| Axios | ^1.5.0 | HTTP 客户端 |
| Quill | ^2.0.3 | 富文本编辑器 |

## 快速开始

### 前置要求

- Node.js >= 16.0.0
- MongoDB >= 4.4
- MinIO（可选，用于对象存储）
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
| 角色 | 邮箱 | 密码 | 权限 |
|------|------|------|------|
| 👑 Owner | owner@example.com | 123456 | 最高权限 |
| 🛡️ Admin | admin@example.com | 123456 | 管理员 |
| ✏️ Editor | editor@example.com | 123456 | 编辑者 |
| 👤 Member | member@example.com | 123456 | 普通成员 |

详细步骤请参考：[快速开始指南](./QUICK_START.md)

## 功能特性

### 🏠 工作台
| 功能 | 说明 | 状态 |
|------|------|------|
| 📅 家庭日历 | 万年历、农历显示、节气节日、事件管理 | ✅ |
| ✅ 待办事项 | 任务创建、优先级、分配、状态管理 | ✅ |
| 🧹 家务分工 | 家务轮换、积分奖励、排行榜 | ✅ NEW |

### 💰 生活管理
| 功能 | 说明 | 状态 |
|------|------|------|
| 💳 家庭财务 | 收支记录、分类统计、月度报表 | ✅ |
| 🛒 购物清单 | 多人协作、周期性购买、消费统计 | ✅ NEW |
| 🍳 家庭食谱 | 食谱管理、食材步骤、烹饪次数统计 | ✅ |
| 🏥 健康档案 | 体检记录、用药记录、疫苗接种、健康指标 | ✅ |
| 📈 成长记录 | 身高体重追踪、里程碑记录、成长图表 | ✅ |
| 📞 紧急联系人 | 分类管理、一键拨打、紧急标记 | ✅ NEW |

### 📚 资料库
| 功能 | 说明 | 状态 |
|------|------|------|
| 📷 家庭相册 | 相册创建、照片上传、批量管理 | ✅ |
| 📁 文件存储 | 文件夹管理、文件上传下载、移动复制 | ✅ |
| 📝 文章管理 | 富文本编辑、AI 辅助写作、评论互动 | ✅ |
| 📖 家庭 Wiki | 知识库管理、版本历史 | ✅ |

### 🔧 工具
| 功能 | 说明 | 状态 |
|------|------|------|
| 🔐 密码保管 | 加密存储、安全分享、访问控制 | ✅ |
| 🎨 AI 图像工具 | 文生图、图生图、图生视频、换脸 | ✅ |
| 🤖 AI 写作助手 | 文章生成、标题生成、摘要生成、内容优化 | ✅ |

### ⚙️ 系统功能
| 功能 | 说明 | 状态 |
|------|------|------|
| 🔔 消息通知 | 实时通知、未读标记、通知中心 | ✅ |
| 🔍 全局搜索 | 搜索文章、文件、相册，支持高级筛选 | ✅ |
| 📊 活动日志 | 操作记录、活动统计、安全审计 | ✅ |
| 👥 成员管理 | 5种角色、精细化权限控制、自定义权限 | ✅ |

### 🤖 AI 能力
| 提供商 | 说明 | 特点 |
|--------|------|------|
| OpenAI | GPT-3.5, GPT-4 | 通用能力强 |
| Claude | Anthropic | 长文本理解好 |
| Gemini | Google | 多模态能力 |
| 通义千问 | 阿里云 | 中文能力强，国内推荐 |
| Wavespeed | AI 创作平台 | 图像/视频生成 |

## API 接口

### 认证接口 `/auth`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/register` | 用户注册 |
| POST | `/auth/login` | 用户登录 |
| POST | `/auth/refresh` | 刷新 Token |

### 用户接口 `/users`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/users/profile` | 获取用户资料 |
| PUT | `/users/profile` | 更新用户资料 |
| GET | `/users/family-members` | 获取家庭成员 |

### 家庭接口 `/families`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/families/:id` | 获取家庭信息 |
| PUT | `/families/:id/members/:memberId/role` | 更新成员角色 |
| PUT | `/families/:id/members/:memberId/permissions` | 更新成员权限 |
| DELETE | `/families/:id/members/:memberId` | 移除成员 |

### 相册接口 `/albums`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/albums` | 获取相册列表 |
| POST | `/albums` | 创建相册 |
| GET | `/albums/:id` | 获取相册详情 |
| PUT | `/albums/:id` | 更新相册 |
| DELETE | `/albums/:id` | 删除相册 |
| POST | `/albums/:id/photos` | 上传照片 |
| DELETE | `/albums/:id/photos/:photoId` | 删除照片 |

### 文件接口 `/files`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/files` | 获取文件列表 |
| POST | `/files/upload` | 上传文件 |
| GET | `/files/download/:id` | 下载文件 |
| DELETE | `/files/:id` | 删除文件 |
| GET | `/files/storage-usage` | 获取存储使用情况 |
| GET | `/files/folders/structure` | 获取文件夹结构 |
| GET | `/files/folders/contents` | 获取文件夹内容 |
| POST | `/files/folders` | 创建文件夹 |
| POST | `/files/:id/move` | 移动文件 |
| DELETE | `/files/folders` | 删除文件夹 |
| POST | `/files/folders/rename` | 重命名文件夹 |

### 文章接口 `/articles`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/articles` | 获取文章列表 |
| POST | `/articles` | 创建文章 |
| GET | `/articles/:id` | 获取文章详情 |
| PUT | `/articles/:id` | 更新文章 |
| DELETE | `/articles/:id` | 删除文章 |
| POST | `/articles/:id/like` | 点赞文章 |
| POST | `/articles/:id/comment` | 评论文章 |

### 日历接口 `/calendar`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/calendar` | 创建事件 |
| GET | `/calendar/perpetual/:year/:month` | 获取万年历信息 |
| GET | `/calendar/family` | 获取家庭事件 |
| GET | `/calendar/my-events` | 获取我的事件 |
| GET | `/calendar/upcoming` | 获取即将到来的事件 |
| GET | `/calendar/:id` | 获取单个事件 |
| PUT | `/calendar/:id` | 更新事件 |
| DELETE | `/calendar/:id` | 删除事件 |
| PUT | `/calendar/:id/status` | 更新事件状态 |

### 财务接口 `/finance`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/finance` | 创建财务记录 |
| GET | `/finance` | 获取交易记录 |
| GET | `/finance/statistics` | 获取财务统计 |
| DELETE | `/finance/:id` | 删除记录 |

### 食谱接口 `/recipes`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/recipes` | 创建食谱 |
| GET | `/recipes` | 获取食谱列表 |
| GET | `/recipes/:id` | 获取食谱详情 |
| PUT | `/recipes/:id` | 更新食谱 |
| PUT | `/recipes/:id/cook` | 增加烹饪次数 |
| DELETE | `/recipes/:id` | 删除食谱 |

### 待办事项接口 `/todos`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/todos` | 创建待办 |
| GET | `/todos` | 获取待办列表 |
| GET | `/todos/:id` | 获取待办详情 |
| PUT | `/todos/:id` | 更新待办 |
| PUT | `/todos/:id/toggle` | 切换完成状态 |
| DELETE | `/todos/:id` | 删除待办 |

### 健康记录接口 `/health`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/health` | 创建健康记录 |
| GET | `/health` | 获取健康记录 |
| GET | `/health/user/:userId` | 获取用户健康记录 |
| PUT | `/health/:id` | 更新记录 |
| DELETE | `/health/:id` | 删除记录 |

### 成长记录接口 `/growth`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/growth` | 创建成长记录 |
| GET | `/growth` | 获取成长记录 |
| GET | `/growth/child/:childId` | 获取孩子成长记录 |
| GET | `/growth/child/:childId/chart` | 获取成长曲线数据 |
| PUT | `/growth/:id` | 更新记录 |
| DELETE | `/growth/:id` | 删除记录 |

### Wiki 接口 `/wiki`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/wiki` | 创建词条 |
| GET | `/wiki` | 获取词条列表 |
| GET | `/wiki/:id` | 获取词条详情 |
| PUT | `/wiki/:id` | 更新词条 |
| DELETE | `/wiki/:id` | 删除词条 |

### 密码管理接口 `/passwords`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/passwords` | 创建密码记录 |
| GET | `/passwords` | 获取密码列表 |
| GET | `/passwords/:id/reveal` | 查看密码明文 |
| PUT | `/passwords/:id` | 更新密码记录 |
| DELETE | `/passwords/:id` | 删除密码记录 |

### AI 接口 `/ai`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/ai/providers` | 获取所有 AI 提供商 |
| POST | `/ai/provider` | 切换 AI 提供商 |
| GET | `/ai/models` | 获取可用模型列表 |
| POST | `/ai/generate-content` | 生成文章内容 |
| POST | `/ai/generate-title` | 生成文章标题 |
| POST | `/ai/generate-excerpt` | 生成文章摘要 |
| POST | `/ai/optimize-content` | 优化文章内容 |

### AI 工具接口 `/ai/tools`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/ai/tools` | 获取可用工具列表 |
| POST | `/ai/tools/chat-agent` | ChatGPT Agent 对话 |
| POST | `/ai/tools/chat-agent/create` | 创建 Agent |
| GET | `/ai/tools/chat-agent/list` | 获取 Agent 列表 |
| POST | `/ai/tools/text-to-image` | 文本生成图像 |
| POST | `/ai/tools/image-to-image` | 图像转换 |
| POST | `/ai/tools/text-to-video` | 文本生成视频 |
| POST | `/ai/tools/image-to-video` | 图像生成视频 |
| POST | `/ai/tools/character-faceswap` | 角色换脸 |
| GET | `/ai/tools/task/:taskId` | 获取任务详情 |
| GET | `/ai/tools/my-tasks` | 获取我的任务列表 |
| GET | `/ai/tools/statistics` | 获取任务统计 |
| DELETE | `/ai/tools/task/:taskId` | 删除任务 |

### 通知接口 `/notifications`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/notifications` | 获取通知列表 |
| GET | `/notifications/unread-count` | 获取未读数量 |
| PUT | `/notifications/:id/read` | 标记为已读 |
| PUT | `/notifications/mark-all-read` | 全部标记为已读 |
| DELETE | `/notifications/:id` | 删除通知 |

### 搜索接口 `/search`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/search` | 全局搜索 |
| GET | `/search/advanced` | 高级搜索 |
| GET | `/search/tags/popular` | 获取热门标签 |

### 活动日志接口 `/activity-logs`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/activity-logs/family` | 获取家庭日志（管理员） |
| GET | `/activity-logs/my-logs` | 获取个人日志 |
| GET | `/activity-logs/family/statistics` | 获取活动统计 |

### 购物清单接口 `/shopping` ✨ NEW
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/shopping` | 创建购物项 |
| GET | `/shopping` | 获取购物清单 |
| GET | `/shopping/pending` | 获取待购买清单 |
| GET | `/shopping/history` | 获取购买历史 |
| GET | `/shopping/statistics` | 获取统计信息 |
| PUT | `/shopping/:id/purchase` | 标记为已购买 |
| PUT | `/shopping/:id/cancel` | 取消购物项 |
| PUT | `/shopping/:id/assign` | 分配给某人 |
| PUT | `/shopping/:id` | 更新购物项 |
| DELETE | `/shopping/:id` | 删除购物项 |

### 家务分工接口 `/chores` ✨ NEW
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/chores` | 创建家务 |
| GET | `/chores` | 获取所有家务 |
| GET | `/chores/my-chores` | 获取我的家务 |
| GET | `/chores/today` | 获取今日家务 |
| GET | `/chores/leaderboard` | 获取排行榜 |
| GET | `/chores/statistics` | 获取统计信息 |
| GET | `/chores/:id` | 获取单个家务 |
| PUT | `/chores/:id/complete` | 完成家务 |
| PUT | `/chores/:id/skip` | 跳过家务 |
| PUT | `/chores/:id/assign` | 分配家务 |
| PUT | `/chores/:id` | 更新家务 |
| DELETE | `/chores/:id` | 删除家务 |

### 紧急联系人接口 `/contacts` ✨ NEW
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/contacts` | 创建联系人 |
| GET | `/contacts` | 获取所有联系人 |
| GET | `/contacts/emergency` | 获取紧急联系人 |
| GET | `/contacts/favorites` | 获取收藏联系人 |
| GET | `/contacts/search` | 搜索联系人 |
| GET | `/contacts/statistics` | 获取统计信息 |
| GET | `/contacts/:id` | 获取单个联系人 |
| PUT | `/contacts/:id/toggle-emergency` | 切换紧急状态 |
| PUT | `/contacts/:id/toggle-favorite` | 切换收藏状态 |
| PUT | `/contacts/:id` | 更新联系人 |
| DELETE | `/contacts/:id` | 删除联系人 |
| POST | `/contacts/bulk-import` | 批量导入 |

## 数据库设计

### 主要集合

| 集合名 | 说明 |
|--------|------|
| users | 用户信息 |
| families | 家庭信息 |
| albums | 相册信息 |
| files | 文件信息 |
| articles | 文章信息 |
| calendar_events | 日历事件 |
| transactions | 财务交易记录 |
| recipes | 食谱信息 |
| todos | 待办事项 |
| health_records | 健康记录 |
| growth_records | 成长记录 |
| wikis | Wiki 词条 |
| passwords | 密码记录（加密存储） |
| notifications | 通知信息 |
| activity_logs | 活动日志 |
| ai_tasks | AI 任务记录 |

### 关键 Schema 说明

#### 日历事件 (CalendarEvent)
```typescript
{
  title: string;           // 事件标题
  type: 'event' | 'birthday' | 'anniversary' | 'todo' | 'reminder';
  description: string;     // 事件描述
  startDate: Date;         // 开始时间
  endDate: Date;           // 结束时间
  allDay: boolean;         // 是否全天事件
  familyId: ObjectId;      // 所属家庭
  createdBy: ObjectId;     // 创建者
  participants: ObjectId[]; // 参与者
  location: string;        // 地点
  reminder: { enabled, before, sent };  // 提醒设置
  recurring: { enabled, frequency, interval, endDate };  // 重复设置
  status: 'pending' | 'completed' | 'cancelled';
  tags: string[];
  color: string;           // 日历显示颜色
}
```

#### 财务交易 (Transaction)
```typescript
{
  type: 'income' | 'expense';  // 收入/支出
  amount: number;              // 金额
  category: string;            // 分类
  description: string;         // 描述
  date: Date;                  // 日期
  familyId: ObjectId;
  createdBy: ObjectId;
  attachments: string[];       // 收据照片
  tags: string[];
}
```

#### 食谱 (Recipe)
```typescript
{
  name: string;                // 食谱名称
  description: string;
  ingredients: [{ name, amount, unit }];  // 食材
  steps: [{ order, description, image }]; // 步骤
  cookingTime: number;         // 烹饪时间（分钟）
  difficulty: 'easy' | 'medium' | 'hard';
  photos: string[];            // 成品照片
  familyId: ObjectId;
  createdBy: ObjectId;
  tags: string[];
  likes: number;
  cooks: number;               // 烹饪次数
}
```

#### 待办事项 (Todo)
```typescript
{
  title: string;
  description: string;
  completed: boolean;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
  familyId: ObjectId;
  createdBy: ObjectId;
  assignedTo: ObjectId;        // 分配给谁
  tags: string[];
}
```

#### 健康记录 (HealthRecord)
```typescript
{
  userId: ObjectId;            // 记录对象
  type: 'checkup' | 'medication' | 'illness' | 'vaccination' | 'metric';
  date: Date;
  title: string;
  description: string;
  data: any;                   // 具体数据（身高、体重、血压等）
  familyId: ObjectId;
  createdBy: ObjectId;
  attachments: string[];       // 报告、处方照片
}
```

#### 成长记录 (GrowthRecord)
```typescript
{
  childId: ObjectId;           // 孩子的用户ID
  date: Date;
  height: number;              // 身高（cm）
  weight: number;              // 体重（kg）
  milestone: string;           // 里程碑事件
  photos: string[];
  notes: string;
  familyId: ObjectId;
  createdBy: ObjectId;
}
```

#### 密码记录 (Password)
```typescript
{
  serviceName: string;         // 服务名称
  username: string;
  encryptedPassword: string;   // 加密后的密码
  url: string;
  notes: string;
  familyId: ObjectId;
  createdBy: ObjectId;
  sharedWith: ObjectId[];      // 共享给哪些成员
  tags: string[];
  lastUsed: Date;
}
```

详细的数据模型设计请参考各模块的 Schema 文件。

## 环境变量配置

### 后端 (.env)
```env
# 基础配置
PORT=3001
MONGODB_URI=mongodb://localhost:27017/homeverse
JWT_SECRET=your-secret-key-change-in-production

# MinIO 对象存储配置
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_BUCKET=homeverse

# AI 配置（可选，至少配置一个）
DEFAULT_AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
CLAUDE_API_KEY=your_claude_api_key
GEMINI_API_KEY=your_gemini_api_key
QWEN_API_KEY=your_qwen_api_key

# Wavespeed AI 工具配置
WAVESPEED_API_KEY=your_wavespeed_api_key

# 邮件配置（可选）
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=your_email
MAIL_PASS=your_password
MAIL_FROM=noreply@example.com

# 代理配置（如需访问国际 AI 服务）
# HTTPS_PROXY=http://127.0.0.1:7890
```

### 前端 (.env)

在 `frontend` 目录下创建 `.env` 文件：

```env
# API 配置
VITE_API_BASE_URL=http://localhost:3001

# 百度地图配置
# 获取方式：访问 https://lbsyun.baidu.com/apiconsole/key 申请 AK
VITE_BAIDU_MAP_AK=your_baidu_map_ak_here

# 地图默认配置（可选）
VITE_MAP_DEFAULT_CENTER_LAT=39.915
VITE_MAP_DEFAULT_CENTER_LNG=116.404
VITE_MAP_DEFAULT_ZOOM=15
```

> 注意：百度地图功能需要配置 `VITE_BAIDU_MAP_AK`，否则位置分享功能的地图视图将无法正常显示。

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

# 初始化演示数据
npm run init-demo

# 代码格式化
npm run format

# 代码检查
npm run lint
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

# 代码检查
npm run lint
```

## 部署指南

### Docker 部署

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3001
CMD ["npm", "run", "start:prod"]
```

### Nginx 配置

详细配置请参考 [nginx配置说明.md](./nginx配置说明.md)

### 完整部署流程

详细部署指南请参考 [部署指南.md](./部署指南.md)

## 注意事项

1. **文件上传**: 
   - 照片上传限制 10MB
   - 文件上传限制 50MB
   - 支持 MinIO 对象存储

2. **安全配置**: 
   - 生产环境请务必修改 JWT_SECRET 为强密钥
   - 密码使用 bcrypt 加密存储
   - 密码保管功能使用加密存储

3. **CORS 配置**: 
   - 后端已配置 CORS，允许前端跨域访问

4. **AI 功能**: 
   - AI 功能为可选功能，不配置也可正常使用其他功能
   - 支持多个 AI 提供商热切换

5. **存储**: 
   - 推荐使用 MinIO 对象存储
   - 支持本地文件存储作为备选

6. **权限控制**:
   - 5种角色：Owner, Admin, Editor, Viewer, Member
   - 精细化权限控制（读取、写入、删除、管理）
   - 支持自定义权限设置

## 相关文档

- [快速开始指南](./QUICK_START.md) - 5分钟快速体验
- [家庭设置指南](./FAMILY_SETUP_GUIDE.md) - 成员管理使用
- [AI 配置指南](./AI_SETUP_GUIDE.md) - AI 功能配置
- [部署指南](./部署指南.md) - 生产环境部署
- [Nginx 配置说明](./nginx配置说明.md) - 反向代理配置

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v2.2 (2026-01)
- ✨ 新增购物清单模块（多人协作、周期性购买、消费统计）
- ✨ 新增家务分工模块（任务轮换、积分奖励、排行榜）
- ✨ 新增紧急联系人模块（分类管理、一键拨打、紧急标记）

### v2.1 (2026-01)
- ✨ 新增日历模块，支持万年历、农历、节气
- ✨ 新增家庭财务管理模块
- ✨ 新增家庭食谱模块
- ✨ 新增待办事项模块
- ✨ 新增健康档案模块
- ✨ 新增成长记录模块
- ✨ 新增家庭 Wiki 知识库
- ✨ 新增密码保管模块
- ✨ 新增 AI 图像/视频工具（文生图、图生视频、换脸）
- ✨ 集成 MinIO 对象存储
- 🔧 优化文件上传流程

### v2.0
- 🔔 新增消息通知系统
- 🔍 新增全局搜索功能
- 📁 新增文件夹管理
- 💬 评论功能增强
- 📊 新增活动日志

### v1.0
- 🏠 用户认证系统
- 👥 家庭管理
- 📷 相册管理
- 📁 文件存储
- 📝 文章管理
- 🤖 AI 辅助写作
