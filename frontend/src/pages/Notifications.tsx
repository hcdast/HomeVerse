import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import notificationService, { Notification } from '../services/notificationService';
import './Notifications.css';

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (filter === 'unread') {
        params.status = 'unread';
      }
      const data = await notificationService.getNotifications(params);
      setNotifications(data.notifications);
      setTotal(data.total);
    } catch (error) {
      console.error('加载通知失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [filter, page]);

  const handleMarkAsRead = async (notification: Notification) => {
    try {
      await notificationService.markAsRead(notification._id);
      if (notification.link) {
        navigate(notification.link);
      }
      loadNotifications();
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      loadNotifications();
    } catch (error) {
      console.error('标记全部已读失败:', error);
    }
  };

  const handleClearRead = async () => {
    if (!confirm('确定要清空所有已读通知吗？')) return;
    try {
      await notificationService.clearRead();
      loadNotifications();
    } catch (error) {
      console.error('清空已读失败:', error);
    }
  };

  const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这条通知吗？')) return;
    try {
      await notificationService.deleteNotification(notificationId);
      loadNotifications();
    } catch (error) {
      console.error('删除通知失败:', error);
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNotificationIcon = (type: string) => {
    const iconMap: { [key: string]: string } = {
      member_invited: '👋',
      member_joined: '🎉',
      member_left: '👋',
      role_changed: '🔑',
      article_commented: '💬',
      article_liked: '❤️',
      file_shared: '📁',
      album_shared: '📷',
      permission_changed: '⚙️',
      system_announcement: '📢',
    };
    return iconMap[type] || '🔔';
  };

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h1>通知中心</h1>
        <div className="header-actions">
          <button onClick={handleMarkAllAsRead} className="btn-secondary">
            全部已读
          </button>
          <button onClick={handleClearRead} className="btn-secondary">
            清空已读
          </button>
        </div>
      </div>

      <div className="notifications-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => {
            setFilter('all');
            setPage(1);
          }}
        >
          全部通知
        </button>
        <button
          className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => {
            setFilter('unread');
            setPage(1);
          }}
        >
          未读通知
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔔</div>
          <p>暂无通知</p>
        </div>
      ) : (
        <>
          <div className="notifications-list">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`notification-card ${notification.status === 'unread' ? 'unread' : ''}`}
                onClick={() => handleMarkAsRead(notification)}
              >
                <div className="notification-icon">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="notification-body">
                  <div className="notification-header-line">
                    <span className="notification-title">{notification.title}</span>
                    <span className="notification-time">{formatTime(notification.createdAt)}</span>
                  </div>
                  <p className="notification-content">{notification.content}</p>
                  {notification.sender && (
                    <div className="notification-sender">
                      来自: {notification.sender.username}
                    </div>
                  )}
                </div>
                <button
                  className="delete-btn"
                  onClick={(e) => handleDelete(notification._id, e)}
                  title="删除"
                >
                  ×
                </button>
                {notification.status === 'unread' && (
                  <span className="unread-indicator"></span>
                )}
              </div>
            ))}
          </div>

          {total > 20 && (
            <div className="pagination">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="btn-secondary"
              >
                上一页
              </button>
              <span className="page-info">
                第 {page} 页 / 共 {Math.ceil(total / 20)} 页
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(total / 20)}
                className="btn-secondary"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Notifications;

