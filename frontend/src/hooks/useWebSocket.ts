import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

interface WebSocketOptions {
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface NotificationPayload {
  _id: string;
  title: string;
  content: string;
  type: string;
  link?: string;
  createdAt: string;
}

export const useWebSocket = (options: WebSocketOptions = {}) => {
  const { token, isAuthenticated } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  const {
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 3000,
  } = options;

  const connect = useCallback(() => {
    if (!token || !isAuthenticated) {
      console.log('WebSocket: 未登录，跳过连接');
      return;
    }

    if (socketRef.current?.connected) {
      console.log('WebSocket: 已连接');
      return;
    }

    const socketUrl = import.meta.env.VITE_WS_URL || '';
    
    socketRef.current = io(`${socketUrl}/notifications`, {
      auth: { token },
      reconnection,
      reconnectionAttempts,
      reconnectionDelay,
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      console.log('WebSocket: 已连接');
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('WebSocket: 已断开 -', reason);
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('WebSocket: 连接错误 -', error.message);
      setIsConnected(false);
    });

    socketRef.current.on('connected', (data) => {
      console.log('WebSocket: 服务端确认连接', data);
    });

  }, [token, isAuthenticated, reconnection, reconnectionAttempts, reconnectionDelay]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('WebSocket: 未连接，无法发送消息');
    }
  }, []);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  const off = useCallback((event: string, callback?: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  }, []);

  // 自动连接
  useEffect(() => {
    if (autoConnect && isAuthenticated && token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, isAuthenticated, token, connect, disconnect]);

  return {
    socket: socketRef.current,
    isConnected,
    lastMessage,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
};

// 通知专用 Hook
export const useNotifications = () => {
  const { on, off, isConnected } = useWebSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);

  useEffect(() => {
    const handleNewNotification = (notification: NotificationPayload) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // 发送浏览器通知
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.content,
          icon: '/icons/icon-192x192.png',
          tag: notification._id,
        });
      }
    };

    on('notification:new', handleNewNotification);

    return () => {
      off('notification:new', handleNewNotification);
    };
  }, [on, off]);

  // 请求通知权限
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    isConnected,
    unreadCount,
    notifications,
    requestNotificationPermission,
    clearNotifications,
  };
};

export default useWebSocket;



