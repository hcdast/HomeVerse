import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

export interface Message {
  _id: string;
  familyId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: 'text' | 'image' | 'file' | 'system';
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyTo?: Message;
  readBy: string[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TypingUser {
  userId: string;
  userName: string;
}

interface SendMessageParams {
  content: string;
  type?: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyTo?: string;
}

export const useChat = () => {
  const { token, isAuthenticated, user } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<{ userId: string; userName: string }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 连接 WebSocket
  const connect = useCallback(() => {
    if (!token || !isAuthenticated) return;
    if (socketRef.current?.connected) return;

    const socketUrl = import.meta.env.VITE_WS_URL || '';
    socketRef.current = io(`${socketUrl}/chat`, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      console.log('Chat: 已连接');
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Chat: 已断开');
      setIsConnected(false);
    });

    socketRef.current.on('chat:connected', (data) => {
      console.log('Chat: 服务端确认', data);
    });

    // 新消息
    socketRef.current.on('message:new', (message: Message) => {
      setMessages(prev => [...prev, message]);
      if (message.senderId !== user?._id) {
        setUnreadCount(prev => prev + 1);
      }
    });

    // 消息删除
    socketRef.current.on('message:deleted', ({ messageId }: { messageId: string }) => {
      setMessages(prev =>
        prev.map(m =>
          m._id === messageId
            ? { ...m, isDeleted: true, content: '此消息已被删除' }
            : m
        )
      );
    });

    // 正在输入状态
    socketRef.current.on('typing:update', ({ userId, userName, isTyping }: { userId: string; userName: string; isTyping: boolean }) => {
      setTypingUsers(prev => {
        if (isTyping) {
          if (!prev.some(u => u.userId === userId)) {
            return [...prev, { userId, userName }];
          }
          return prev;
        } else {
          return prev.filter(u => u.userId !== userId);
        }
      });
    });

    // 用户上线
    socketRef.current.on('user:online', ({ userId, userName }: { userId: string; userName: string }) => {
      setOnlineMembers(prev => {
        if (!prev.some(m => m.userId === userId)) {
          return [...prev, { userId, userName }];
        }
        return prev;
      });
    });

    // 用户离线
    socketRef.current.on('user:offline', ({ userId }: { userId: string }) => {
      setOnlineMembers(prev => prev.filter(m => m.userId !== userId));
      setTypingUsers(prev => prev.filter(u => u.userId !== userId));
    });

    // 消息已读更新
    socketRef.current.on('message:read_update', ({ userId, messageIds }: { userId: string; messageIds: string[] }) => {
      setMessages(prev =>
        prev.map(m =>
          messageIds.includes(m._id) && !m.readBy.includes(userId)
            ? { ...m, readBy: [...m.readBy, userId] }
            : m
        )
      );
    });

  }, [token, isAuthenticated, user?._id]);

  // 断开连接
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // 发送消息
  const sendMessage = useCallback(async (params: SendMessageParams) => {
    if (!socketRef.current?.connected) {
      throw new Error('未连接到聊天服务');
    }

    return new Promise((resolve, reject) => {
      socketRef.current!.emit('message:send', params, (response: any) => {
        if (response.success) {
          resolve(response.message);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  // 正在输入
  const startTyping = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing:start');
      
      // 3秒后自动停止
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 3000);
    }
  }, []);

  const stopTyping = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing:stop');
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  // 标记已读
  const markAsRead = useCallback((messageIds: string[]) => {
    if (socketRef.current?.connected && messageIds.length > 0) {
      socketRef.current.emit('message:read', messageIds);
      setUnreadCount(0);
    }
  }, []);

  // 删除消息
  const deleteMessage = useCallback((messageId: string) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('未连接'));
        return;
      }
      socketRef.current.emit('message:delete', messageId, (response: any) => {
        if (response.success) {
          resolve(true);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  // 加载历史消息
  const loadMessages = useCallback(async (before?: string) => {
    try {
      const params = new URLSearchParams();
      params.append('limit', '50');
      if (before) params.append('before', before);
      
      const response = await api.get(`/chat/messages?${params.toString()}`);
      const newMessages = response.data.messages || [];
      
      if (before) {
        setMessages(prev => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
      }
      
      return newMessages;
    } catch (error) {
      console.error('加载消息失败:', error);
      return [];
    }
  }, []);

  // 搜索消息
  const searchMessages = useCallback(async (keyword: string) => {
    try {
      const response = await api.get(`/chat/search?keyword=${encodeURIComponent(keyword)}`);
      return response.data.messages || [];
    } catch (error) {
      console.error('搜索消息失败:', error);
      return [];
    }
  }, []);

  // 自动连接
  useEffect(() => {
    if (isAuthenticated && token) {
      connect();
      loadMessages();
    }
    return () => {
      disconnect();
    };
  }, [isAuthenticated, token, connect, disconnect, loadMessages]);

  return {
    isConnected,
    messages,
    typingUsers,
    onlineMembers,
    unreadCount,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    deleteMessage,
    loadMessages,
    searchMessages,
    connect,
    disconnect,
  };
};

export default useChat;



