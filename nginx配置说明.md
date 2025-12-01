# 📝 Nginx 配置说明

## 📁 已生成的文件

1. **nginx.conf** - Nginx 配置文件
2. **部署指南.md** - 完整部署文档
3. **deploy.sh** - Linux 一键部署脚本
4. **deploy-windows.ps1** - Windows 部署脚本

---

## 🔧 nginx.conf 配置说明

### 核心配置

#### 1. 后端代理

```nginx
upstream homeverse_backend {
    server 127.0.0.1:3001;  # 后端服务地址
}

location /api/ {
    proxy_pass http://homeverse_backend/;  # 代理到后端
}
```

#### 2. 前端静态文件

```nginx
location / {
    root /var/www/homeverse/frontend/dist;  # 前端构建目录
    try_files $uri $uri/ /index.html;       # SPA 路由支持
}
```

#### 3. 文件上传

```nginx
location /uploads/ {
    alias /var/www/homeverse/backend/uploads/;  # 上传文件目录
}

client_max_body_size 100M;  # 最大上传 100MB
```

---

## 🎯 必须修改的配置

### 1. 域名

```nginx
server_name homeverse.yourdomain.com;  # ← 改为你的域名
```

### 2. 文件路径

```nginx
# 前端路径
root /var/www/homeverse/frontend/dist;  # ← 确认路径

# 上传文件路径
alias /var/www/homeverse/backend/uploads/;  # ← 确认路径
```

### 3. SSL 证书（HTTPS）

```nginx
ssl_certificate /etc/nginx/ssl/homeverse.crt;      # ← 证书路径
ssl_certificate_key /etc/nginx/ssl/homeverse.key;  # ← 私钥路径
```

---

## 🚀 快速部署

### Linux 系统

```bash
# 1. 赋予执行权限
chmod +x deploy.sh

# 2. 运行部署脚本
sudo ./deploy.sh

# 3. 修改配置
sudo nano /etc/nginx/sites-available/homeverse

# 4. 测试配置
sudo nginx -t

# 5. 重新加载
sudo systemctl reload nginx
```

### Windows 系统

```powershell
# 1. 以管理员身份运行 PowerShell

# 2. 运行部署脚本
.\deploy-windows.ps1

# 3. 手动配置 IIS 或使用 Nginx for Windows
```

---

## 📊 配置功能

### ✅ 已配置功能

- [x] HTTP 服务（80端口）
- [x] HTTPS 服务（443端口）
- [x] 后端 API 代理
- [x] 前端静态文件服务
- [x] 文件上传支持（100MB）
- [x] Gzip 压缩
- [x] 静态资源缓存（1年）
- [x] SPA 路由支持
- [x] WebSocket 支持
- [x] 安全头配置
- [x] SSL 优化
- [x] 健康检查端点

---

## 🔍 验证配置

### 测试 Nginx 配置

```bash
sudo nginx -t
```

**成功输出**：
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 测试前端访问

```bash
curl http://localhost
# 应该返回 HTML 内容
```

### 测试后端代理

```bash
curl http://localhost/api/health-check
# 应该返回 JSON: {"status":"ok",...}
```

---

## 📋 配置检查清单

### 部署前

- [ ] 修改域名
- [ ] 修改文件路径
- [ ] 配置 SSL 证书（生产环境）
- [ ] 配置 .env 文件
- [ ] 调整上传大小限制（如需要）

### 部署后

- [ ] Nginx 配置测试通过
- [ ] 可以访问前端页面
- [ ] API 代理正常工作
- [ ] 文件上传正常
- [ ] SSL 证书有效（生产环境）
- [ ] 所有功能测试通过

---

## 🔐 安全配置

### 已包含的安全措施

```nginx
# 1. 安全头
add_header X-Frame-Options "SAMEORIGIN";
add_header X-Content-Type-Options "nosniff";
add_header X-XSS-Protection "1; mode=block";

# 2. HTTPS 强制
add_header Strict-Transport-Security "max-age=31536000";

# 3. SSL 优化
ssl_protocols TLSv1.2 TLSv1.3;
```

### 建议的额外配置

```nginx
# 隐藏 Nginx 版本
server_tokens off;

# 限制请求速率
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req zone=api burst=20;
```

---

## 🎯 性能优化

### 已配置的优化

- ✅ Gzip 压缩（6级）
- ✅ 静态资源长期缓存
- ✅ HTTP/2 支持
- ✅ Keepalive 连接
- ✅ 缓冲区优化

### 建议的额外优化

```nginx
# 1. 开启 Brotli 压缩（需要模块）
# brotli on;
# brotli_comp_level 6;

# 2. 配置 CDN
# 将 /assets/ 指向 CDN

# 3. 配置缓存服务器
# proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m;
```

---

## 🆘 故障排查

### 502 Bad Gateway

**原因**：后端未启动

**解决**：
```bash
pm2 status
pm2 restart homeverse-backend
```

### 404 Not Found

**原因**：路径配置错误

**解决**：检查 `root` 和 `alias` 路径是否正确

### 413 Request Entity Too Large

**原因**：上传文件超过限制

**解决**：
```nginx
client_max_body_size 200M;  # 增大限制
```

---

## 🎉 总结

**完整的生产环境配置已生成！**

✅ **nginx.conf** - 完整配置文件  
✅ **部署指南.md** - 详细部署步骤  
✅ **deploy.sh** - Linux 一键部署  
✅ **deploy-windows.ps1** - Windows 部署  

**按照文档部署，即可将 HomeVerse 部署到生产环境！** 🚀

---

**配置特点**：
- 📦 开箱即用
- 🔒 安全加固
- ⚡ 性能优化
- 📱 全功能支持
- 📝 详细注释

**立即开始部署！** 🌐✨

