import axios from 'axios';
import { useGlobalToastStore } from '@/store/globalToastStore';

// 创建axios实例
const api = axios.create({
  baseURL: '/api', // 通过vite代理到后端
  timeout: 30000, // 增加超时时间，支持大文件上传
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加token
api.interceptors.request.use(
  (config) => {
    // 从 zustand persist 存储中获取 token
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const authData = JSON.parse(authStorage);
        if (authData?.state?.token) {
          config.headers.Authorization = `Bearer ${authData.state.token}`;
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误（401 时派发事件，由 App 内统一 logout + Toast 再跳转，保证状态同步）
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const redirect = encodeURIComponent(window.location.pathname + window.location.search || '/');
      window.dispatchEvent(new CustomEvent('auth:session-expired', { detail: { redirect } }));
    } else if (error.response?.status && error.response.status >= 500) {
      const msg = error.response?.data?.message || '服务异常，请稍后重试';
      useGlobalToastStore.getState().show(msg, 'error');
    }
    return Promise.reject(error);
  }
);

export default api;

