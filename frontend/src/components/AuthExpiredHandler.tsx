import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useGlobalToastStore } from '@/store/globalToastStore';

/**
 * 监听 401 会话过期事件：同步 logout、显示 Toast、带 redirect 跳转登录页
 */
export default function AuthExpiredHandler() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const showToast = useGlobalToastStore((s) => s.show);

  useEffect(() => {
    const handler = (e: CustomEvent<{ redirect?: string }>) => {
      logout();
      showToast('登录已过期，请重新登录', 'error');
      const to = e.detail?.redirect ? `/login?redirect=${e.detail.redirect}` : '/login';
      setTimeout(() => navigate(to, { replace: true }), 1500);
    };
    window.addEventListener('auth:session-expired', handler as EventListener);
    return () => window.removeEventListener('auth:session-expired', handler as EventListener);
  }, [logout, showToast, navigate]);

  return null;
}
