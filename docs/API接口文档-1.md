# HomeVerse API 接口文档

## 基础信息

- **Base URL**: http://localhost:3001/api (开发环境)
- **认证方式**: JWT Bearer Token
- **请求头**: Authorization: Bearer <token>
- **响应格式**: JSON

## 1. 认证模块 (Auth)

### 1.1 用户注册
- **接口**: POST /auth/register
- **描述**: 注册新用户并创建家庭
- **请求体**:
`json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "familyName": "string"
}
`
- **响应**:
`json
{
  "user": { "id": "string", "username": "string", "email": "string" },
  "family": { "id": "string", "name": "string" },
  "token": "string"
}
`

### 1.2 用户登录
- **接口**: POST /auth/login
- **描述**: 用户登录获取 Token
- **请求体**:
`json
{
  "email": "string",
  "password": "string"
}
`
- **响应**:
`json
{
  "user": { "id": "string", "username": "string", "email": "string", "familyId": "string", "role": "string" },
  "token": "string"
}
`

### 1.3 刷新 Token
- **接口**: POST /auth/refresh
- **描述**: 刷新访问令牌
- **认证**: 需要
- **响应**: 同登录响应

## 2. 用户模块 (Users)

### 2.1 获取当前用户资料
- **接口**: GET /users/profile
- **认证**: 需要
- **响应**:
`json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "avatar": "string",
  "familyId": "string",
  "role": "string",
  "permissions": {}
}
`

### 2.2 更新用户资料
- **接口**: PUT /users/profile
- **认证**: 需要
- **请求体**:
`json
{
  "username": "string",
  "avatar": "string"
}
`

### 2.3 获取家庭成员列表
- **接口**: GET /users/family-members
- **认证**: 需要
- **响应**: 成员数组

## 3. 家庭模块 (Families)

### 3.1 获取我的家庭信息
- **接口**: GET /families/my-family
- **认证**: 需要
- **响应**:
`json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "createdBy": "string",
  "members": ["string"],
  "settings": {}
}
`

### 3.2 获取家庭成员
- **接口**: GET /families/:id/members
- **认证**: 需要
- **权限**: READ members
- **响应**: 成员详细信息数组

### 3.3 邀请成员
- **接口**: POST /families/:id/invite
- **认证**: 需要
- **权限**: WRITE members
- **请求体**:
`json
{
  "email": "string",
  "role": "member"
}
`

### 3.4 更新成员角色
- **接口**: PUT /families/:id/members/:memberId/role
- **认证**: 需要
- **权限**: Owner/Admin
- **请求体**:
`json
{
  "role": "admin|editor|viewer|member"
}
`

### 3.5 更新成员权限
- **接口**: PUT /families/:id/members/:memberId/permissions
- **认证**: 需要
- **权限**: Owner/Admin
- **请求体**:
`json
{
  "permissions": {
    "albums": { "read": true, "write": true, "delete": false }
  }
}
`

### 3.6 移除成员
- **接口**: DELETE /families/:id/members/:memberId
- **认证**: 需要
- **权限**: Owner/Admin

### 3.7 转让所有权
- **接口**: POST /families/:id/transfer-ownership
- **认证**: 需要
- **权限**: Owner
- **请求体**:
`json
{
  "newOwnerId": "string"
}
`

### 3.8 更新家庭信息
- **接口**: PUT /families/:id
- **认证**: 需要
- **权限**: WRITE family
- **请求体**:
`json
{
  "name": "string",
  "description": "string"
}
`

## 4. 相册模块 (Albums)

### 4.1 获取相册列表
- **接口**: GET /albums
- **认证**: 需要
- **响应**: 相册数组

### 4.2 创建相册
- **接口**: POST /albums
- **认证**: 需要
- **请求体**:
`json
{
  "title": "string",
  "description": "string",
  "coverImage": "string",
  "privacy": "public|private",
  "tags": ["string"]
}
`

### 4.3 获取相册详情
- **接口**: GET /albums/:id
- **认证**: 需要
- **响应**: 相册详细信息（包含照片列表）

### 4.4 更新相册
- **接口**: PUT /albums/:id
- **认证**: 需要
- **请求体**: 同创建相册

### 4.5 删除相册
- **接口**: DELETE /albums/:id
- **认证**: 需要
- **说明**: 会同时删除 MinIO 中的所有照片文件

### 4.6 上传照片（单张）
- **接口**: POST /albums/:id/photos
- **认证**: 需要
- **Content-Type**: multipart/form-data
- **请求体**:
  - ile: 图片文件（最大 10MB）
- **支持格式**: jpg, jpeg, png, gif, webp
- **响应**:
`json
{
  "message": "照片上传成功",
  "photo": {},
  "album": {},
  "url": "string"
}
`

### 4.7 批量上传照片
- **接口**: POST /albums/:id/photos/batch
- **认证**: 需要
- **Content-Type**: multipart/form-data
- **请求体**:
  - iles: 多个图片文件（最多 100 张，每张最大 10MB）
- **响应**:
`json
{
  "message": "成功上传 X 张照片",
  "total": 10,
  "success": 9,
  "failed": 1,
  "album": {}
}
`

### 4.8 删除照片
- **接口**: DELETE /albums/:id/photos/:photoId
- **认证**: 需要
- **说明**: 会同时删除 MinIO 中的照片文件

## 5. 文件模块 (Files)

### 5.1 获取文件列表
- **接口**: GET /files
- **认证**: 需要
- **查询参数**:
  - older: 文件夹路径（可选）
- **响应**: 文件数组

### 5.2 上传文件
- **接口**: POST /files/upload
- **认证**: 需要
- **Content-Type**: multipart/form-data
- **请求体**:
  - ile: 文件（最大 50MB）
  - older: 文件夹路径（可选）
  - 	ags: 标签（逗号分隔，可选）
- **响应**:
`json
{
  "message": "文件上传成功",
  "file": {},
  "url": "string"
}
`

### 5.3 下载文件
- **接口**: GET /files/download/:id
- **认证**: 需要
- **说明**: 重定向到 MinIO URL，自动增加下载次数

### 5.4 删除文件
- **接口**: DELETE /files/:id
- **认证**: 需要
- **说明**: 会同时删除 MinIO 中的文件

### 5.5 获取存储使用情况
- **接口**: GET /files/storage-usage
- **认证**: 需要
- **响应**:
`json
{
  "totalSize": 1024000,
  "fileCount": 50,
  "limit": 10737418240
}
`

### 5.6 获取文件夹结构
- **接口**: GET /files/folders/structure
- **认证**: 需要
- **响应**: 文件夹树形结构

### 5.7 获取文件夹内容
- **接口**: GET /files/folders/contents
- **认证**: 需要
- **查询参数**:
  - path: 文件夹路径
- **响应**: 文件和子文件夹列表

### 5.8 创建文件夹
- **接口**: POST /files/folders
- **认证**: 需要
- **请求体**:
`json
{
  "folderName": "string",
  "parentPath": "string"
}
`

### 5.9 移动文件
- **接口**: POST /files/:id/move
- **认证**: 需要
- **请求体**:
`json
{
  "targetPath": "string"
}
`

### 5.10 删除文件夹
- **接口**: DELETE /files/folders
- **认证**: 需要
- **查询参数**:
  - path: 文件夹路径
- **说明**: 会删除文件夹内所有文件及 MinIO 中的文件

### 5.11 重命名文件夹
- **接口**: POST /files/folders/rename
- **认证**: 需要
- **请求体**:
`json
{
  "oldPath": "string",
  "newName": "string"
}
`

## 6. 文章模块 (Articles)

### 6.1 获取文章列表
- **接口**: GET /articles
- **认证**: 需要
- **查询参数**:
  - status: 文章状态（可选）
- **响应**: 文章数组

### 6.2 创建文章
- **接口**: POST /articles
- **认证**: 需要
- **请求体**:
`json
{
  "title": "string",
  "content": "string",
  "excerpt": "string",
  "coverImage": "string",
  "status": "draft|published",
  "tags": ["string"]
}
`

### 6.3 获取文章详情
- **接口**: GET /articles/:id
- **认证**: 需要
- **说明**: 自动增加阅读量
- **响应**: 文章详细信息

### 6.4 更新文章
- **接口**: PUT /articles/:id
- **认证**: 需要
- **请求体**: 同创建文章

### 6.5 删除文章
- **接口**: DELETE /articles/:id
- **认证**: 需要

### 6.6 点赞/取消点赞
- **接口**: POST /articles/:id/like
- **认证**: 需要
- **响应**: 更新后的文章

### 6.7 添加评论
- **接口**: POST /articles/:id/comment
- **认证**: 需要
- **请求体**:
`json
{
  "content": "string"
}
`

### 6.8 添加评论回复
- **接口**: POST /articles/:id/comment/:commentId/reply
- **认证**: 需要
- **请求体**:
`json
{
  "content": "string"
}
`

### 6.9 删除评论
- **接口**: DELETE /articles/:id/comment/:commentId
- **认证**: 需要

### 6.10 点赞评论
- **接口**: POST /articles/:id/comment/:commentId/like
- **认证**: 需要

## 7. 日历模块 (Calendar)

### 7.1 创建事件
- **接口**: POST /calendar
- **认证**: 需要
- **请求体**:
`json
{
  "title": "string",
  "description": "string",
  "startTime": "2024-01-01T10:00:00Z",
  "endTime": "2024-01-01T11:00:00Z",
  "location": "string",
  "isAllDay": false,
  "repeat": "none|daily|weekly|monthly|yearly",
  "participants": ["userId"],
  "reminders": [{ "type": "notification", "minutes": 15 }]
}
`

### 7.2 获取万年历信息
- **接口**: GET /calendar/perpetual/:year/:month
- **认证**: 需要
- **响应**: 农历、节气、节日等信息

### 7.3 获取聚合事件
- **接口**: GET /calendar/aggregated/:year/:month
- **认证**: 需要
- **说明**: 整合日历、待办、提醒、纪念日
- **响应**: 聚合后的事件列表

### 7.4 获取家庭事件
- **接口**: GET /calendar/family
- **认证**: 需要
- **查询参数**:
  - startDate: 开始日期
  - endDate: 结束日期
- **响应**: 事件数组

### 7.5 获取我的事件
- **接口**: GET /calendar/my-events
- **认证**: 需要
- **查询参数**: 同上

### 7.6 获取即将到来的事件
- **接口**: GET /calendar/upcoming
- **认证**: 需要
- **响应**: 未来 7 天的事件

### 7.7 获取单个事件
- **接口**: GET /calendar/:id
- **认证**: 需要

### 7.8 更新事件
- **接口**: PUT /calendar/:id
- **认证**: 需要
- **请求体**: 同创建事件

### 7.9 删除事件
- **接口**: DELETE /calendar/:id
- **认证**: 需要

### 7.10 更新事件状态
- **接口**: PUT /calendar/:id/status
- **认证**: 需要
- **请求体**:
`json
{
  "status": "pending|completed|cancelled"
}
`

## 8. 财务模块 (Finance)

### 8.1 创建财务记录
- **接口**: POST /finance
- **认证**: 需要
- **请求体**:
`json
{
  "type": "income|expense",
  "amount": 100.50,
  "category": "string",
  "description": "string",
  "date": "2024-01-01",
  "paymentMethod": "cash|card|alipay|wechat|other"
}
`

### 8.2 获取财务记录
- **接口**: GET /finance
- **认证**: 需要
- **查询参数**:
  - startDate: 开始日期
  - endDate: 结束日期
- **响应**: 财务记录数组

### 8.3 获取统计信息
- **接口**: GET /finance/statistics
- **认证**: 需要
- **查询参数**:
  - year: 年份
  - month: 月份
- **响应**:
`json
{
  "totalIncome": 10000,
  "totalExpense": 5000,
  "balance": 5000,
  "categoryStats": [],
  "monthlyTrend": []
}
`

### 8.4 删除财务记录
- **接口**: DELETE /finance/:id
- **认证**: 需要

