@echo off
echo 正在启动 HomeVerse 后端服务...
echo.

REM 检查 node_modules 是否存在
if not exist "node_modules" (
    echo 正在安装依赖...
    call npm install
    echo.
)

REM 检查 .env 文件是否存在
if not exist ".env" (
    echo 警告: .env 文件不存在，将使用默认配置
    echo 请复制 .env.example 为 .env 并配置环境变量
    echo.
)

REM 启动开发服务器
echo 启动开发服务器...
call npm run start:dev

pause

