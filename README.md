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
│   │   └── articles/ # 文章模块
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

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd HomeVerse
```

2. **安装后端依赖**
```bash
cd backend
npm install
```

3. **配置后端环境变量**
```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件，配置 MongoDB 连接和 JWT 密钥
```

4. **启动 MongoDB**
```bash
# 确保 MongoDB 服务正在运行
# Windows: 启动 MongoDB 服务
# macOS/Linux: mongod
```

5. **启动后端服务**
```bash
cd backend
npm run start:dev
# 后端服务将在 http://localhost:3001 运行
```

6. **安装前端依赖**
```bash
cd ../frontend
npm install
```

7. **启动前端开发服务器**
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

### 页面功能

- 🏠 **首页**: 数据统计和概览
- 📷 **相册**: 相册列表、创建相册、上传照片
- 📁 **文件**: 文件列表、上传文件、下载文件
- 📝 **文章**: 文章列表、创建文章、查看文章
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
MONGODB_URI=mongodb://localhost:27017/homeverse
JWT_SECRET=your-secret-key-change-in-production
PORT=3001
```

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

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
