# HomeVerse 后端服务

基于 NestJS 的家庭管理平台后端 API 服务。

## 安装依赖

```bash
npm install
```

## 环境配置

复制 `.env.example` 为 `.env` 并配置：

```env
# MongoDB 连接字符串（带认证）
MONGODB_URI=mongodb://homeverse_user:homeverse_pass123@localhost:27017/homeverse?authSource=homeverse

# 如果 MongoDB 未启用认证，使用：
# MONGODB_URI=mongodb://localhost:27017/homeverse

JWT_SECRET=your-secret-key-change-in-production
PORT=3001
```

### MongoDB 认证说明

如果使用带认证的 MongoDB（推荐生产环境）：
- **应用账号**: `homeverse_user` / `homeverse_pass123`
- **管理员账号**: `admin` / `admin123456`
- 连接字符串格式: `mongodb://用户名:密码@主机:端口/数据库名?authSource=认证数据库`

详细配置请参考 `deploy/mongo/README.md`

## 运行

```bash
# 开发模式
npm run start:dev

# 生产模式
npm run build
npm run start:prod
```

## 项目结构

```
src/
├── auth/          # 认证模块（JWT、登录、注册）
├── users/         # 用户模块
├── families/      # 家庭模块
├── albums/        # 相册模块
├── files/         # 文件模块
├── articles/      # 文章模块
├── app.module.ts  # 根模块
└── main.ts        # 入口文件
```

## API 文档

启动服务后访问 `http://localhost:3001` 查看健康检查。

所有 API 接口都需要 JWT 认证（除了注册和登录接口）。

