import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import notificationService, { Notification } from '../services/notificationService';
import './NotificationBell.css';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 加载通知
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [notifData, count] = await Promise.all([
        notificationService.getNotifications({ limit: 5 }),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(notifData.notifications);
      setUnreadCount(count);
    } catch (error) {
      console.error('加载通知失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // 每30秒刷新一次
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // 标记为已读
  const handleMarkAsRead = async (notification: Notification) => {
    try {
      await notificationService.markAsRead(notification._id);
      await loadNotifications();
      if (notification.link) {
        navigate(notification.link);
      }
      setShowDropdown(false);
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  // 标记所有为已读
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      await loadNotifications();
    } catch (error) {
      console.error('标记全部已读失败:', error);
    }
  };

  // 格式化时间
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
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="notification-bell">
      <button
        className="bell-button"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="dropdown-header">
            <h3>通知</h3>
            {unreadCount > 0 && (
              <button className="mark-all-read" onClick={handleMarkAllAsRead}>
                全部已读
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="loading">加载中...</div>
            ) : notifications.length === 0 ? (
              <div className="empty">暂无通知</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`notification-item ${notification.status === 'unread' ? 'unread' : ''}`}
                  onClick={() => handleMarkAsRead(notification)}
                >
                  {notification.sender?.avatar && (
                    <img
                      src={notification.sender.avatar}
                      alt={notification.sender.username}
                      className="sender-avatar"
                    />
                  )}
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-text">{notification.content}</div>
                    <div className="notification-time">{formatTime(notification.createdAt)}</div>
                  </div>
                  {notification.status === 'unread' && <span className="unread-dot"></span>}
                </div>
              ))
            )}
          </div>

          <div className="dropdown-footer">
            <button onClick={() => {
              navigate('/notifications');
              setShowDropdown(false);
            }}>
              查看全部
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

