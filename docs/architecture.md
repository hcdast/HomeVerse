# HomeVerse 项目架构文档

## 项目概述

HomeVerse 是一个现代化的家庭数字管理平台，采用 NestJS + React + MongoDB 技术栈构建。

### 核心特性
- 40+ 功能模块
- 5 种角色权限体系
- 实时 WebSocket 通信
- 多 AI 提供商集成
- MinIO 对象存储
- PWA 支持

## 技术架构

### 后端技术栈
- **框架**: NestJS 10.x + TypeScript 5.x
- **数据库**: MongoDB + Mongoose ODM
- **认证**: Passport.js + JWT
- **存储**: MinIO 对象存储
- **实时通信**: Socket.IO
- **AI 集成**: OpenAI, Claude, Gemini, Qwen, Wavespeed

### 前端技术栈
- **框架**: React 18.x + TypeScript 5.x
- **构建工具**: Vite 4.x
- **路由**: React Router 6.x
- **状态管理**: Zustand
- **HTTP 客户端**: Axios
- **实时通信**: socket.io-client

## 模块架构

### 核心模块
1. **认证系统** (auth)
2. **用户管理** (users)
3. **家庭管理** (families)

### 内容管理模块
4. **相册** (albums)
5. **文件** (files)
6. **文章** (articles)
7. **Wiki** (wiki)
8. **动态** (moments)

### 生活管理模块
9. **日历** (calendar)
10. **财务** (finance)
11. **预算** (budgets)
12. **食谱** (recipes)
13. **待办** (todos)
14. **健康** (health)
15. **成长** (growth)
16. **购物** (shopping)
17. **家务** (chores)
18. **联系人** (contacts)

### 工具模块
19. **密码** (passwords)
20. **提醒** (reminders)
21. **目标** (goals)
22. **位置** (locations)
23. **旅行** (travels)
24. **教育** (education)
25. **宠物** (pets)
26. **家电** (appliances)
27. **书籍** (books)
28. **纪念日** (anniversaries)

### 系统模块
29. **通知** (notifications)
30. **搜索** (search)
31. **活动日志** (activity-logs)
32. **AI 服务** (ai)
33. **AI 工具** (ai-tools)
34. **模板** (templates)
35. **数据传输** (data-transfer)
36. **存储** (storage)
37. **邮件** (mail)
38. **数据库** (database)

## 权限体系

### 角色定义
- **Owner**: 所有者，拥有所有权限
- **Admin**: 管理员，拥有管理权限
- **Editor**: 编辑者，可编辑内容
- **Viewer**: 访客，只读权限
- **Member**: 成员，基础权限

### 资源权限
- **READ**: 读取权限
- **WRITE**: 写入权限
- **DELETE**: 删除权限
- **MANAGE**: 管理权限

## 数据模型

### 用户模型 (User)
- username: 用户名
- email: 邮箱
- password: 加密密码
- avatar: 头像
- familyId: 家庭ID
- role: 角色
- permissions: 自定义权限

### 家庭模型 (Family)
- name: 家庭名称
- description: 描述
- createdBy: 创建者
- members: 成员列表
- settings: 家庭设置

## 部署架构

### 开发环境
- Backend: http://localhost:3001
- Frontend: http://localhost:3000
- MongoDB: mongodb://localhost:27017
- MinIO: http://localhost:9000

### 生产环境
- Nginx 反向代理
- PM2 进程管理
- MongoDB 集群
- MinIO 分布式存储

