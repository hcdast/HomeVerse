# 更新日志

## [1.1.0] - 2025-12-29

### ✨ 新增功能

#### MinIO 对象存储集成
- 完整集成 MinIO 对象存储服务（115.190.245.230:9000）
- 所有文件上传功能统一使用 MinIO 存储
- 支持公网访问的永久 URL

#### 新增 StorageModule
- **位置**: `src/storage/`
- **功能**:
  - 自动检查并创建存储桶
  - 文件上传、下载、删除
  - 批量操作支持
  - 预签名 URL 生成
  - 公网 URL 生成

### 🔧 模块更新

#### 1. Files 模块
- ✅ 文件上传到 MinIO (`files/` 文件夹)
- ✅ 文件下载通过 MinIO URL 重定向
- ✅ 文件删除同步删除 MinIO 对象
- ✅ 移除本地存储依赖

**更改文件**:
- `src/files/files.module.ts` - 导入 StorageModule
- `src/files/files.controller.ts` - 集成 StorageService

#### 2. Albums 模块
- ✅ 照片上传到 MinIO (`photos/` 文件夹)
- ✅ 相册删除同步删除所有照片
- ✅ 支持照片批量删除

**更改文件**:
- `src/albums/albums.module.ts` - 导入 StorageModule
- `src/albums/albums.controller.ts` - 集成 StorageService

#### 3. AI Tools 模块
- ✅ 图像编辑：上传源图到 MinIO (`ai-images/`)
- ✅ 图像生成视频：上传源图到 MinIO (`ai-videos/`)
- ✅ 角色换脸：上传人脸图到 MinIO (`ai-faceswap/`)
- ✅ 修复 Image-to-Image 工具的 API 调用

**更改文件**:
- `src/ai/ai.module.ts` - 导入 StorageModule
- `src/ai/ai-tools.controller.ts` - 集成 StorageService
- `src/ai/tools/image-to-image.tool.ts` - 使用 JSON 格式调用 API
- `src/ai/tools/text-to-image.tool.ts` - 修复尺寸格式 (x → *)

### 🐛 Bug 修复

#### Wavespeed AI API 调用
1. **Text-to-Image 尺寸格式错误**
   - ❌ 之前: `1024x1024`
   - ✅ 修复: `1024*1024`
   - 📁 文件: `src/ai/tools/text-to-image.tool.ts`

2. **Image-to-Image 请求格式错误**
   - ❌ 之前: 使用 FormData + 错误的端点
   - ✅ 修复: 使用 JSON + 模型名作为端点
   - 📁 文件: `src/ai/tools/image-to-image.tool.ts`

3. **模型配置统一**
   - 所有 maxSize 从 `x` 格式改为 `*` 格式
   - 📁 文件: `src/ai/enums/wavespeed-models.enum.ts`

### 📦 依赖更新

```json
{
  "minio": "^8.0.x"
}
```

### ⚙️ 配置更新

#### 新增环境变量 (.env)
```bash
# MinIO 对象存储配置
MINIO_ENDPOINT=115.190.245.230
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=hc@123456
MINIO_BUCKET=homeverse
```

### 📊 数据库变更

#### Files 集合
- `path` 字段：从本地路径改为 MinIO URL
  - 之前: `/uploads/files/xxx.pdf`
  - 现在: `http://115.190.245.230:9000/homeverse/files/xxx.pdf`

#### Albums 集合 (photos)
- `path` 字段：从本地路径改为 MinIO URL
  - 之前: `/uploads/photos/xxx.jpg`
  - 现在: `http://115.190.245.230:9000/homeverse/photos/xxx.jpg`

### 🏗️ 架构改进

#### 存储架构
```
之前: 本地文件系统 (./uploads/)
现在: MinIO 对象存储 (公网访问)
```

#### 文件上传流程
```
1. 客户端上传文件 → 后端
2. 后端上传文件 → MinIO
3. MinIO 返回公网 URL
4. 后端保存 URL 到数据库
5. 返回 URL 给客户端
```

#### AI 图像处理流程
```
1. 客户端上传图片 → 后端
2. 后端上传图片 → MinIO
3. 获取 MinIO 公网 URL
4. 使用 URL 调用 Wavespeed API
5. 返回生成结果
```

### 📝 新增文档

- `MINIO_INTEGRATION.md` - MinIO 集成完整文档
- `backend/CHANGELOG.md` - 此更新日志

### ⚠️ 破坏性变更

#### 本地文件系统废弃
- ⚠️ 不再使用 `./uploads/` 文件夹存储文件
- ⚠️ 所有新上传的文件都会存储到 MinIO
- ⚠️ 旧文件需要手动迁移（参考 MINIO_INTEGRATION.md）

#### API 响应变更
上传接口现在返回包含 `url` 字段：
```json
{
  "message": "文件上传成功",
  "file": {...},
  "url": "http://115.190.245.230:9000/homeverse/files/xxx.pdf"
}
```

### 🔐 安全更新

1. **文件访问控制**
   - MinIO 存储桶设置为公开读取
   - 所有文件通过公网 URL 访问
   - 保留权限验证在应用层

2. **文件大小限制**
   - Files: 50MB
   - Albums: 10MB
   - AI Tools: 10MB

3. **文件类型验证**
   - Albums: 仅允许图片格式
   - 其他模块：由前端控制

### 🚀 性能优化

1. **文件访问速度**
   - 直接从 MinIO CDN 访问
   - 无需经过应用服务器

2. **存储扩展性**
   - 分离存储和计算
   - 支持水平扩展

### 🧪 测试建议

#### 1. Files 模块测试
```bash
# 上传文件
curl -X POST http://localhost:3001/files/upload \
  -H "Authorization: Bearer {token}" \
  -F "file=@test.pdf"

# 下载文件
curl http://localhost:3001/files/download/{fileId}

# 删除文件
curl -X DELETE http://localhost:3001/files/{fileId}
```

#### 2. Albums 模块测试
```bash
# 上传照片
curl -X POST http://localhost:3001/albums/{albumId}/photos \
  -H "Authorization: Bearer {token}" \
  -F "file=@test.jpg"
```

#### 3. AI Tools 测试
```bash
# 图像编辑
curl -X POST http://localhost:3001/ai/tools/image-to-image \
  -H "Authorization: Bearer {token}" \
  -F "file=@test.jpg" \
  -F "prompt=变成油画风格"
```

### 📋 迁移步骤

#### 从旧版本升级

1. **安装依赖**
```bash
cd backend
npm install
```

2. **配置环境变量**
```bash
# 复制并编辑 .env
cp .env.example .env
# 确保添加 MinIO 配置
```

3. **启动服务**
```bash
npm run build
npm run start:dev
```

4. **验证 MinIO 连接**
查看日志确认：
```
[StorageService] ✅ MinIO 存储服务已就绪
```

5. **迁移旧文件**（可选）
参考 `MINIO_INTEGRATION.md` 中的迁移脚本

### 🔄 回滚方案

如需回滚到旧版本：
1. 恢复使用本地文件系统
2. 修改 `files.controller.ts` 和 `albums.controller.ts`
3. 移除 StorageModule 依赖

### 👥 贡献者

- MinIO 集成：AI Assistant
- Wavespeed API 修复：AI Assistant
- 文档编写：AI Assistant

### 📞 支持

如遇问题，请查看：
- `MINIO_INTEGRATION.md` - 详细集成文档
- 应用日志中的 `[StorageService]` 标签
- GitHub Issues

---

## [1.0.0] - 2025-12-28

初始版本发布


