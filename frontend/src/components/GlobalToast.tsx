import React, { useEffect } from 'react';
import { useGlobalToastStore } from '@/store/globalToastStore';
import Toast from './Toast';

/**
 * 全局 Toast，用于在非组件内触发提示（如 401 时由 api 拦截器间接触发）
 */
const GlobalToast = () => {
  const { message, type, hide } = useGlobalToastStore();

  useEffect(() => {
    if (message) {
      const t = setTimeout(hide, 3000);
      return () => clearTimeout(t);
    }
  }, [message, hide]);

  if (!message) return null;
  return (
    <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10000 }}>
      <Toast message={message} type={type} onClose={hide} />
    </div>
  );
};

export default GlobalToast;
