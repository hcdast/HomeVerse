import api from './api'; // 使用配置好的 api 实例

const API_URL = '/notifications';

export interface Notification {
  _id: string;
  recipient: string;
  sender?: {
    _id: string;
    username: string;
    avatar?: string;
  };
  familyId?: string;
  type: string;
  title: string;
  content: string;
  metadata?: any;
  status: 'unread' | 'read' | 'archived';
  readAt?: Date;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

class NotificationService {
  // 获取通知列表
  async getNotifications(params?: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<NotificationsResponse> {
    const response = await api.get(API_URL, { params });
    return response.data;
  }

  // 获取未读通知数量
  async getUnreadCount(): Promise<number> {
    const response = await api.get(`${API_URL}/unread-count`);
    return response.data.count;
  }

  // 标记为已读
  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await api.put(`${API_URL}/${notificationId}/read`);
    return response.data;
  }

  // 标记所有为已读
  async markAllAsRead(): Promise<{ modifiedCount: number }> {
    const response = await api.put(`${API_URL}/mark-all-read`);
    return response.data;
  }

  // 删除通知
  async deleteNotification(notificationId: string): Promise<void> {
    await api.delete(`${API_URL}/${notificationId}`);
  }

  // 清空已读通知
  async clearRead(): Promise<{ deletedCount: number }> {
    const response = await api.delete(`${API_URL}/clear-read`);
    return response.data;
  }
}

export default new NotificationService();

