# HomeVerse 前端应用

基于 React + TypeScript + Vite 的家庭管理平台前端应用。

## 安装依赖

```bash
npm install
```

## 运行

```bash
# 开发模式
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

## 项目结构

```
src/
├── components/    # 通用组件
│   └── Layout.tsx # 布局组件
├── pages/         # 页面组件
│   ├── Login.tsx  # 登录页
│   ├── Register.tsx # 注册页
│   ├── Dashboard.tsx # 首页
│   ├── Albums.tsx    # 相册页
│   ├── Files.tsx     # 文件页
│   ├── Articles.tsx  # 文章页
│   └── Profile.tsx   # 个人页
├── services/      # API 服务
│   └── api.ts     # Axios 实例
├── store/         # 状态管理
│   └── authStore.ts # 认证状态
├── App.tsx        # 根组件
└── main.tsx       # 入口文件
```

## 开发说明

- 前端通过 Vite 代理 `/api` 请求到后端 `http://localhost:3001`
- 使用 Zustand 进行状态管理，认证信息持久化到 localStorage
- 使用 React Router 进行路由管理

