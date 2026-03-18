import { useState, useEffect, useCallback } from 'react';
import { useNotifications } from '../hooks/useWebSocket';
import './NotificationToast.css';

interface ToastItem {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

const NotificationToast = () => {
  const { notifications, isConnected } = useNotifications();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // 当收到新通知时添加 toast
  useEffect(() => {
    if (notifications.length > 0) {
      const latestNotification = notifications[0];
      const newToast: ToastItem = {
        id: latestNotification._id || Date.now().toString(),
        title: latestNotification.title,
        content: latestNotification.content,
        type: getToastType(latestNotification.type),
        timestamp: new Date(latestNotification.createdAt),
      };

      setToasts((prev) => {
        // 防止重复
        if (prev.some((t) => t.id === newToast.id)) {
          return prev;
        }
        return [newToast, ...prev].slice(0, 5); // 最多显示5条
      });
    }
  }, [notifications]);

  // 自动移除 toast
  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts((prev) => prev.slice(0, -1));
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [toasts]);

  const getToastType = (notificationType: string): ToastItem['type'] => {
    const typeMap: Record<string, ToastItem['type']> = {
      member_invited: 'info',
      member_joined: 'success',
      role_changed: 'warning',
      article_commented: 'info',
      article_liked: 'success',
      permission_changed: 'warning',
    };
    return typeMap[notificationType] || 'info';
  };

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getIcon = (type: ToastItem['type']) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '🔔';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="notification-toast-container">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className={`notification-toast toast-${toast.type}`}
          style={{ animationDelay: `${index * 0.1}s` }}
          onClick={() => removeToast(toast.id)}
        >
          <span className="toast-icon">{getIcon(toast.type)}</span>
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.content}</div>
          </div>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            ×
          </button>
          <div className="toast-progress" />
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;




