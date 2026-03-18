import { useState, useEffect } from 'react';
import api from '@/services/api';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import useConfirm from '@/hooks/useConfirm';
import './Announcements.css';

interface User {
  _id: string;
  username: string;
  avatar?: string;
}

interface Comment {
  _id: string;
  userId: User;
  content: string;
  createdAt: string;
}

interface Reaction {
  emoji: string;
  users: User[];
}

interface Announcement {
  _id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: string;
  isPinned: boolean;
  createdBy: User;
  mentions: User[];
  readBy: User[];
  confirmedBy: User[];
  requireConfirmation: boolean;
  expiresAt?: string;
  attachments: string[];
  tags: string[];
  icon?: string;
  comments: Comment[];
  reactions: Reaction[];
  createdAt: string;
}

const priorityConfig = {
  low: { label: '普通', color: '#52c41a', icon: '📢' },
  normal: { label: '一般', color: '#1890ff', icon: '📌' },
  high: { label: '重要', color: '#fa8c16', icon: '⚠️' },
  urgent: { label: '紧急', color: '#ff4d4f', icon: '🚨' },
};

const emojiOptions = ['👍', '❤️', '😊', '🎉', '👏', '💪', '🙏', '✅'];

const Announcements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pinnedAnnouncements, setPinnedAnnouncements] = useState<Announcement[]>([]);
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'mentioned' | 'pending'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [commentText, setCommentText] = useState('');
  const { toast, hideToast, success, error } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirm();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    isPinned: false,
    mentions: [] as string[],
    requireConfirmation: false,
    icon: '📢',
    tags: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      const [announcementsRes, pinnedRes, unreadRes, membersRes] = await Promise.all([
        api.get('/announcements'),
        api.get('/announcements/pinned'),
        api.get('/announcements/unread-count'),
        api.get('/users/family-members'),
      ]);

      setAnnouncements(announcementsRes.data.announcements || []);
      setPinnedAnnouncements(Array.isArray(pinnedRes.data) ? pinnedRes.data : []);
      setUnreadCount(unreadRes.data.count || 0);
      setFamilyMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
    } catch (err) {
      console.error('加载数据失败:', err);
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      error('请填写标题和内容');
      return;
    }

    try {
      await api.post('/announcements', {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
      });
      success('公告发布成功');
      setShowCreateModal(false);
      setFormData({
        title: '',
        content: '',
        priority: 'normal',
        isPinned: false,
        mentions: [],
        requireConfirmation: false,
        icon: '📢',
        tags: '',
      });
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '发布失败');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '删除公告',
      message: '确定要删除这条公告吗？此操作不可恢复。',
      confirmText: '删除',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/announcements/${id}`);
      success('删除成功');
      loadData();
      if (selectedAnnouncement?._id === id) {
        setSelectedAnnouncement(null);
      }
    } catch (err: any) {
      error(err.response?.data?.message || '删除失败');
    }
  };

  const handleTogglePin = async (id: string) => {
    try {
      await api.put(`/announcements/${id}/pin`);
      success('操作成功');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.put(`/announcements/${id}/read`);
      loadData();
    } catch (err) {
      console.error('标记已读失败:', err);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await api.put(`/announcements/${id}/confirm`);
      success('已确认');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '确认失败');
    }
  };

  const handleAddComment = async () => {
    if (!selectedAnnouncement || !commentText.trim()) return;

    try {
      const res = await api.post(`/announcements/${selectedAnnouncement._id}/comments`, {
        content: commentText,
      });
      setSelectedAnnouncement(res.data);
      setCommentText('');
      success('评论成功');
    } catch (err: any) {
      error(err.response?.data?.message || '评论失败');
    }
  };

  const handleAddReaction = async (id: string, emoji: string) => {
    try {
      const res = await api.post(`/announcements/${id}/reactions`, { emoji });
      if (selectedAnnouncement?._id === id) {
        setSelectedAnnouncement(res.data);
      }
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const toggleMention = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      mentions: prev.mentions.includes(userId)
        ? prev.mentions.filter(id => id !== userId)
        : [...prev.mentions, userId],
    }));
  };

  const openDetail = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    handleMarkRead(announcement._id);
  };

  return (
    <div className="announcements-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">📣 家庭公告板</h1>
          <p className="page-subtitle">重要通知一目了然</p>
        </div>
        <div className="header-actions">
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount} 条未读</span>
          )}
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            + 发布公告
          </button>
        </div>
      </div>

      {/* 置顶公告 */}
      {pinnedAnnouncements.length > 0 && (
        <div className="pinned-section">
          <h3>📌 置顶公告</h3>
          <div className="pinned-list">
            {pinnedAnnouncements.map(a => (
              <div
                key={a._id}
                className={`pinned-card priority-${a.priority}`}
                onClick={() => openDetail(a)}
              >
                <span className="pinned-icon">{a.icon || priorityConfig[a.priority].icon}</span>
                <div className="pinned-content">
                  <h4>{a.title}</h4>
                  <p>{a.content.substring(0, 50)}...</p>
                </div>
                <span className="pinned-time">{new Date(a.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 标签页 */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
          全部公告
        </button>
        <button className={`tab ${activeTab === 'mentioned' ? 'active' : ''}`} onClick={() => setActiveTab('mentioned')}>
          @我的
        </button>
        <button className={`tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
          待确认
        </button>
      </div>

      {/* 公告列表 */}
      <div className="announcements-layout">
        <div className="announcements-list">
          {announcements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📣</div>
              <p>暂无公告</p>
            </div>
          ) : (
            announcements.map(a => (
              <div
                key={a._id}
                className={`announcement-card priority-${a.priority} ${selectedAnnouncement?._id === a._id ? 'selected' : ''}`}
                onClick={() => openDetail(a)}
              >
                <div className="announcement-header">
                  <span className="announcement-icon">{a.icon || priorityConfig[a.priority].icon}</span>
                  <div className="announcement-title-section">
                    <h3>{a.title}</h3>
                    <div className="announcement-meta">
                      <span className={`priority-tag priority-${a.priority}`}>
                        {priorityConfig[a.priority].label}
                      </span>
                      {a.isPinned && <span className="pin-tag">📌 置顶</span>}
                      {a.requireConfirmation && <span className="confirm-tag">需确认</span>}
                    </div>
                  </div>
                </div>

                <p className="announcement-preview">{a.content.substring(0, 100)}...</p>

                <div className="announcement-footer">
                  <div className="footer-left">
                    <span className="author">
                      {a.createdBy?.username || '未知'}
                    </span>
                    <span className="time">{new Date(a.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="footer-right">
                    {a.mentions.length > 0 && (
                      <span className="mentions">@{a.mentions.length}人</span>
                    )}
                    {a.comments.length > 0 && (
                      <span className="comments">💬{a.comments.length}</span>
                    )}
                    {a.reactions.length > 0 && (
                      <span className="reactions">
                        {a.reactions.slice(0, 3).map(r => r.emoji).join('')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 详情面板 */}
        {selectedAnnouncement && (
          <div className="announcement-detail">
            <div className="detail-header">
              <div className="detail-title">
                <span className="detail-icon">{selectedAnnouncement.icon || priorityConfig[selectedAnnouncement.priority].icon}</span>
                <h2>{selectedAnnouncement.title}</h2>
              </div>
              <div className="detail-actions">
                <button onClick={() => handleTogglePin(selectedAnnouncement._id)}>
                  {selectedAnnouncement.isPinned ? '取消置顶' : '置顶'}
                </button>
                <button onClick={() => handleDelete(selectedAnnouncement._id)}>删除</button>
                <button onClick={() => setSelectedAnnouncement(null)}>关闭</button>
              </div>
            </div>

            <div className="detail-meta">
              <span className={`priority-tag priority-${selectedAnnouncement.priority}`}>
                {priorityConfig[selectedAnnouncement.priority].label}
              </span>
              <span>发布者: {selectedAnnouncement.createdBy?.username}</span>
              <span>{new Date(selectedAnnouncement.createdAt).toLocaleString()}</span>
            </div>

            {selectedAnnouncement.mentions.length > 0 && (
              <div className="detail-mentions">
                <span>@</span>
                {selectedAnnouncement.mentions.map(u => (
                  <span key={u._id} className="mention-user">{u.username}</span>
                ))}
              </div>
            )}

            <div className="detail-content">
              {selectedAnnouncement.content}
            </div>

            {selectedAnnouncement.requireConfirmation && (
              <div className="confirm-section">
                <div className="confirm-status">
                  已确认: {selectedAnnouncement.confirmedBy.length} 人
                </div>
                <button className="btn-confirm" onClick={() => handleConfirm(selectedAnnouncement._id)}>
                  ✓ 确认已阅
                </button>
              </div>
            )}

            {/* 表情反应 */}
            <div className="reactions-section">
              <div className="reactions-list">
                {selectedAnnouncement.reactions.map(r => (
                  <button
                    key={r.emoji}
                    className="reaction-btn"
                    onClick={() => handleAddReaction(selectedAnnouncement._id, r.emoji)}
                  >
                    {r.emoji} {r.users.length}
                  </button>
                ))}
              </div>
              <div className="add-reaction">
                {emojiOptions.map(emoji => (
                  <button
                    key={emoji}
                    className="emoji-btn"
                    onClick={() => handleAddReaction(selectedAnnouncement._id, emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* 评论区 */}
            <div className="comments-section">
              <h4>💬 评论 ({selectedAnnouncement.comments.length})</h4>
              <div className="comments-list">
                {selectedAnnouncement.comments.map(c => (
                  <div key={c._id} className="comment-item">
                    <span className="comment-author">{c.userId?.username || '未知'}</span>
                    <span className="comment-content">{c.content}</span>
                    <span className="comment-time">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="comment-input">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="写评论..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                />
                <button onClick={handleAddComment}>发送</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 创建公告模态框 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h2>📣 发布公告</h2>
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label>标题 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="公告标题"
                />
              </div>
              <div className="form-group" style={{ width: 80 }}>
                <label>图标</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  maxLength={4}
                />
              </div>
            </div>
            <div className="form-group">
              <label>内容 *</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="公告内容..."
                rows={5}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>优先级</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                >
                  <option value="low">普通</option>
                  <option value="normal">一般</option>
                  <option value="high">重要</option>
                  <option value="urgent">紧急</option>
                </select>
              </div>
              <div className="form-group">
                <label>标签（逗号分隔）</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="例如: 通知, 重要"
                />
              </div>
            </div>
            <div className="form-group">
              <label>@提醒成员</label>
              <div className="member-checkboxes">
                {familyMembers.map(m => (
                  <label key={m._id} className="member-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.mentions.includes(m._id)}
                      onChange={() => toggleMention(m._id)}
                    />
                    {m.username}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isPinned}
                  onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                />
                置顶公告
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.requireConfirmation}
                  onChange={(e) => setFormData({ ...formData, requireConfirmation: e.target.checked })}
                />
                需要成员确认
              </label>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowCreateModal(false)}>取消</button>
              <button onClick={handleCreate}>发布</button>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialogComponent}
    </div>
  );
};

export default Announcements;
