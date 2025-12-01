#!/bin/bash

# HomeVerse 一键部署脚本
# 使用方法: chmod +x deploy.sh && ./deploy.sh

echo "🚀 HomeVerse 部署脚本"
echo "===================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目目录
PROJECT_DIR="/root/deploy/HomeVerse"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# 检查是否为 root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用 sudo 运行此脚本${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 权限检查通过${NC}"

# 步骤1：检查依赖
echo ""
echo "📋 检查依赖..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js 未安装${NC}"
    echo "请先安装 Node.js 20+"
    exit 1
fi
echo -e "${GREEN}✓ Node.js 已安装: $(node -v)${NC}"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm 未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm 已安装: $(npm -v)${NC}"

# 检查 MongoDB
if ! command -v mongod &> /dev/null; then
    echo -e "${YELLOW}⚠ MongoDB 未安装，请手动安装${NC}"
else
    echo -e "${GREEN}✓ MongoDB 已安装${NC}"
fi

# 检查 Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}⚠ Nginx 未安装，请手动安装${NC}"
else
    echo -e "${GREEN}✓ Nginx 已安装: $(nginx -v 2>&1)${NC}"
fi

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装 PM2..."
    npm install -g pm2
fi
echo -e "${GREEN}✓ PM2 已安装${NC}"

# 步骤2：部署后端
echo ""
echo "🔧 部署后端..."

if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}✗ 后端目录不存在: $BACKEND_DIR${NC}"
    exit 1
fi

cd $BACKEND_DIR

# 安装依赖
echo "📦 安装后端依赖..."
npm install --production
npm audit fix --force

# 检查 .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env 文件不存在，请手动创建${NC}"
    cp .env.example .env 2>/dev/null || true
fi

# 构建
echo "🔨 构建后端..."
npm run build

# 停止旧进程
pm2 delete homeverse-backend 2>/dev/null || true

# 启动服务
echo "🚀 启动后端服务..."
pm2 start npm --name "homeverse-backend" -- run start:prod

echo -e "${GREEN}✓ 后端部署完成${NC}"

# 步骤3：部署前端
echo ""
echo "🎨 部署前端..."

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}✗ 前端目录不存在: $FRONTEND_DIR${NC}"
    exit 1
fi

cd $FRONTEND_DIR

# 安装依赖
echo "📦 安装前端依赖..."
npm install

# 构建
echo "🔨 构建前端..."
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}✗ 前端构建失败，dist 目录不存在${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 前端构建完成${NC}"

# 步骤4：移动前端到 /var/www
echo ""
echo "📦 移动前端到 /var/www..."

TARGET_WWW="/var/www/homeverse"
mkdir -p $TARGET_WWW/frontend

if [ -d "$FRONTEND_DIR/dist" ]; then
    cp -r $FRONTEND_DIR/dist $TARGET_WWW/frontend/

    chown -R www-data:www-data $TARGET_WWW/frontend
    chmod -R 755 $TARGET_WWW/frontend
    echo -e "${GREEN}✓ 前端文件已移动到 /var/www/homeverse/frontend${NC}"
else
    echo -e "${RED}✗ 前端 dist 目录不存在${NC}"
    exit 1
fi

# 步骤5：配置 Nginx
echo ""
echo "⚙️ 配置 Nginx..."

if [ -f "$PROJECT_DIR/nginx.conf" ]; then
    # 复制配置
    cp $PROJECT_DIR/nginx.conf /etc/nginx/sites-available/homeverse
    
    # 创建软链接
    # ln -sf /etc/nginx/sites-available/homeverse /etc/nginx/sites-enabled/homeverse
    
    # 删除默认配置
    rm -f /etc/nginx/sites-enabled/default
    
    # 测试配置
    nginx -t
    
    if [ $? -eq 0 ]; then
        # 重新加载
        systemctl reload nginx
        echo -e "${GREEN}✓ Nginx 配置成功${NC}"
    else
        echo -e "${RED}✗ Nginx 配置测试失败${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ nginx.conf 文件不存在，请手动配置${NC}"
fi

# 步骤6：设置开机自启
echo ""
echo "⚡ 配置开机自启..."
pm2 startup
pm2 save

# 完成
echo ""
echo "===================="
echo -e "${GREEN}🎉 部署完成！${NC}"
echo ""
echo "📋 服务状态:"
pm2 status
echo ""
echo "🌐 访问地址:"
echo "   HTTP:  http://$(hostname -I | awk '{print $1}')"
echo "   或: http://your-domain.com"
echo ""
echo "📝 后续操作:"
echo "   1. 修改 backend/.env 配置"
echo "   2. 修改 nginx.conf 中的域名"
echo "   3. 配置 SSL 证书（生产环境）"
echo ""
echo "📂 部署位置:"
echo "   前端: /var/www/homeverse/frontend/dist"
echo "   后端: /root/deploy/HomeVerse/backend"
echo ""
echo "🔍 查看日志:"
echo "   后端: pm2 logs homeverse-backend"
echo "   Nginx: sudo tail -f /var/log/nginx/homeverse_error.log"
echo ""
echo "🧪 测试访问:"
echo "   curl http://localhost"
echo ""

