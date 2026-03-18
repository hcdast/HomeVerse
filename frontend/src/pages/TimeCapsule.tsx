import { useState, useEffect } from 'react';
import api from '../services/api';
import './TimeCapsule.css';

interface CapsuleContent {
  _id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  text?: string;
  fileUrl?: string;
  fileName?: string;
  addedBy?: { _id: string; username: string; avatar?: string };
  addedAt: string;
}

interface Contributor {
  userId: { _id: string; username: string; avatar?: string };
  hasContributed: boolean;
  contentCount: number;
}

interface TimeCapsule {
  _id: string;
  title: string;
  description?: string;
  status: 'draft' | 'sealed' | 'opened';
  openDate: string;
  sealedAt?: string;
  openedAt?: string;
  contents: CapsuleContent[];
  contributors: Contributor[];
  createdBy: { _id: string; username: string; avatar?: string };
  coverImage?: string;
  theme?: string;
  tags: string[];
  createdAt: string;
}

interface Statistics {
  total: number;
  sealed: number;
  opened: number;
  nextToOpen: TimeCapsule | null;
}

const TimeCapsulePage = () => {
  const [capsules, setCapsules] = useState<TimeCapsule[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCapsule, setSelectedCapsule] = useState<TimeCapsule | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddContentModal, setShowAddContentModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'draft' | 'sealed' | 'opened' | 'all'>('all');

  const [newCapsule, setNewCapsule] = useState({
    title: '',
    description: '',
    openDate: '',
    theme: 'classic',
  });

  const [newContent, setNewContent] = useState({
    type: 'text' as 'text' | 'image',
    text: '',
    fileUrl: '',
  });

  useEffect(() => {
    loadCapsules();
    loadStatistics();
  }, [activeTab]);

  const loadCapsules = async () => {
    try {
      setLoading(true);
      const params = activeTab === 'all' ? '' : `?status=${activeTab}`;
      const res = await api.get(`/time-capsule${params}`);
      setCapsules(res.data.capsules);
    } catch (err) {
      console.error('加载时间胶囊失败', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const res = await api.get('/time-capsule/statistics');
      setStatistics(res.data);
    } catch (err) {
      console.error('加载统计失败', err);
    }
  };

  const loadCapsuleDetail = async (id: string) => {
    try {
      const res = await api.get(`/time-capsule/${id}`);
      setSelectedCapsule(res.data);
    } catch (err) {
      console.error('加载详情失败', err);
    }
  };

  const handleCreateCapsule = async () => {
    if (!newCapsule.title || !newCapsule.openDate) {
      alert('请填写标题和开启日期');
      return;
    }

    try {
      await api.post('/time-capsule', newCapsule);
      setShowCreateModal(false);
      setNewCapsule({ title: '', description: '', openDate: '', theme: 'classic' });
      loadCapsules();
      loadStatistics();
    } catch (err) {
      console.error('创建失败', err);
    }
  };

  const handleSeal = async (id: string) => {
    if (!confirm('封存后内容将无法查看，直到开启日期。确定要封存吗？')) return;

    try {
      await api.put(`/time-capsule/${id}/seal`);
      loadCapsules();
      loadStatistics();
      if (selectedCapsule?._id === id) {
        loadCapsuleDetail(id);
      }
    } catch (err) {
      console.error('封存失败', err);
    }
  };

  const handleOpen = async (id: string) => {
    try {
      await api.put(`/time-capsule/${id}/open`);
      loadCapsules();
      loadStatistics();
      if (selectedCapsule?._id === id) {
        loadCapsuleDetail(id);
      }
    } catch (err) {
      console.error('开启失败', err);
    }
  };

  const handleAddContent = async () => {
    if (!selectedCapsule) return;
    if (!newContent.text && !newContent.fileUrl) {
      alert('请输入内容');
      return;
    }

    try {
      await api.post(`/time-capsule/${selectedCapsule._id}/contents`, newContent);
      setShowAddContentModal(false);
      setNewContent({ type: 'text', text: '', fileUrl: '' });
      loadCapsuleDetail(selectedCapsule._id);
    } catch (err) {
      console.error('添加内容失败', err);
    }
  };

  const handleDeleteCapsule = async (id: string) => {
    if (!confirm('确定要删除这个时间胶囊吗？')) return;

    try {
      await api.delete(`/time-capsule/${id}`);
      setSelectedCapsule(null);
      loadCapsules();
      loadStatistics();
    } catch (err) {
      console.error('删除失败', err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr);
    const today = new Date();
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: '草稿',
      sealed: '已封存',
      opened: '已开启',
    };
    return labels[status] || status;
  };

  const themes = [
    { key: 'classic', label: '经典', color: '#8b5cf6' },
    { key: 'romantic', label: '浪漫', color: '#ec4899' },
    { key: 'nature', label: '自然', color: '#22c55e' },
    { key: 'vintage', label: '复古', color: '#a16207' },
  ];

  return (
    <div className="time-capsule-page">
      <div className="page-header">
        <div className="header-content">
          <h1>📦 时间胶囊</h1>
          <p>封存此刻，邂逅未来的自己</p>
        </div>
        <button className="btn-create" onClick={() => setShowCreateModal(true)}>
          ✨ 创建胶囊
        </button>
      </div>

      {statistics && (
        <div className="stats-cards">
          <div className="stat-card sealed">
            <span className="stat-icon">🔒</span>
            <div className="stat-info">
              <span className="stat-value">{statistics.sealed}</span>
              <span className="stat-label">已封存</span>
            </div>
          </div>
          <div className="stat-card opened">
            <span className="stat-icon">🎁</span>
            <div className="stat-info">
              <span className="stat-value">{statistics.opened}</span>
              <span className="stat-label">已开启</span>
            </div>
          </div>
          {statistics.nextToOpen && (
            <div className="stat-card next">
              <span className="stat-icon">⏳</span>
              <div className="stat-info">
                <span className="stat-value">
                  {getDaysUntil(statistics.nextToOpen.openDate)} 天
                </span>
                <span className="stat-label">下个胶囊开启</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="tabs">
        {(['all', 'draft', 'sealed', 'opened'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'all' ? '全部' : getStatusLabel(tab)}
          </button>
        ))}
      </div>

      <div className="capsule-layout">
        <div className="capsules-list">
          {loading ? (
            <div className="loading">加载中...</div>
          ) : capsules.length === 0 ? (
            <div className="empty">暂无时间胶囊</div>
          ) : (
            capsules.map((capsule) => {
              const daysUntil = getDaysUntil(capsule.openDate);

              return (
                <div
                  key={capsule._id}
                  className={`capsule-card ${capsule.status} ${selectedCapsule?._id === capsule._id ? 'selected' : ''}`}
                  onClick={() => loadCapsuleDetail(capsule._id)}
                >
                  <div
                    className="capsule-cover"
                    style={{
                      backgroundImage: capsule.coverImage ? `url(${capsule.coverImage})` : undefined,
                    }}
                  >
                    {capsule.status === 'sealed' && (
                      <div className="capsule-lock">🔒</div>
                    )}
                    {capsule.status === 'opened' && (
                      <div className="capsule-opened">✨</div>
                    )}
                  </div>
                  <div className="capsule-info">
                    <h3>{capsule.title}</h3>
                    <p className="capsule-date">
                      {capsule.status === 'opened'
                        ? `已于 ${formatDate(capsule.openedAt!)} 开启`
                        : `${formatDate(capsule.openDate)} 开启`}
                    </p>
                    {capsule.status === 'sealed' && daysUntil > 0 && (
                      <span className="days-badge">还有 {daysUntil} 天</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="capsule-detail">
          {selectedCapsule ? (
            <>
              <div className="detail-header">
                <div>
                  <h2>{selectedCapsule.title}</h2>
                  <span className={`status-badge ${selectedCapsule.status}`}>
                    {getStatusLabel(selectedCapsule.status)}
                  </span>
                </div>
                <div className="detail-actions">
                  {selectedCapsule.status === 'draft' && (
                    <>
                      <button
                        className="btn-add-content"
                        onClick={() => setShowAddContentModal(true)}
                      >
                        ➕ 添加内容
                      </button>
                      <button
                        className="btn-seal"
                        onClick={() => handleSeal(selectedCapsule._id)}
                      >
                        🔒 封存
                      </button>
                    </>
                  )}
                  {selectedCapsule.status === 'sealed' && getDaysUntil(selectedCapsule.openDate) <= 0 && (
                    <button
                      className="btn-open"
                      onClick={() => handleOpen(selectedCapsule._id)}
                    >
                      🎁 开启
                    </button>
                  )}
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteCapsule(selectedCapsule._id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {selectedCapsule.description && (
                <p className="detail-description">{selectedCapsule.description}</p>
              )}

              <div className="detail-meta">
                <span>创建者：{selectedCapsule.createdBy?.username}</span>
                <span>开启日期：{formatDate(selectedCapsule.openDate)}</span>
                <span>内容数量：{selectedCapsule.contents.length}</span>
              </div>

              <div className="contributors-section">
                <h4>贡献者</h4>
                <div className="contributors-list">
                  {selectedCapsule.contributors.map((c, i) => (
                    <div key={i} className="contributor-item">
                      <div className="contributor-avatar">
                        {c.userId?.avatar ? (
                          <img src={c.userId.avatar} alt="" />
                        ) : (
                          <span>{c.userId?.username?.[0] || '?'}</span>
                        )}
                      </div>
                      <span className="contributor-name">{c.userId?.username}</span>
                      {c.hasContributed && <span className="contributed-badge">✓</span>}
                    </div>
                  ))}
                </div>
              </div>

              {(selectedCapsule.status === 'draft' || selectedCapsule.status === 'opened') && (
                <div className="contents-section">
                  <h4>胶囊内容</h4>
                  {selectedCapsule.contents.length === 0 ? (
                    <p className="no-content">暂无内容</p>
                  ) : (
                    <div className="contents-list">
                      {selectedCapsule.contents.map((content) => (
                        <div key={content._id} className="content-item">
                          {content.type === 'text' && (
                            <p className="content-text">{content.text}</p>
                          )}
                          {content.type === 'image' && content.fileUrl && (
                            <img src={content.fileUrl} alt="" className="content-image" />
                          )}
                          <div className="content-meta">
                            <span>{content.addedBy?.username}</span>
                            <span>{formatDate(content.addedAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedCapsule.status === 'sealed' && (
                <div className="sealed-notice">
                  <div className="sealed-icon">🔒</div>
                  <h3>胶囊已封存</h3>
                  <p>内容将在 {formatDate(selectedCapsule.openDate)} 开启</p>
                  <p className="countdown">
                    还有 <strong>{getDaysUntil(selectedCapsule.openDate)}</strong> 天
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="no-selection">
              <div className="no-selection-icon">📦</div>
              <p>选择一个时间胶囊查看详情</p>
            </div>
          )}
        </div>
      </div>

      {/* 创建胶囊弹窗 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>创建时间胶囊</h2>

            <div className="form-group">
              <label>胶囊名称</label>
              <input
                type="text"
                value={newCapsule.title}
                onChange={(e) => setNewCapsule((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="给这个胶囊起个名字"
              />
            </div>

            <div className="form-group">
              <label>描述（可选）</label>
              <textarea
                value={newCapsule.description}
                onChange={(e) =>
                  setNewCapsule((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="写下你想说的话..."
              />
            </div>

            <div className="form-group">
              <label>开启日期</label>
              <input
                type="date"
                value={newCapsule.openDate}
                onChange={(e) => setNewCapsule((prev) => ({ ...prev, openDate: e.target.value }))}
                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label>主题风格</label>
              <div className="theme-options">
                {themes.map((theme) => (
                  <button
                    key={theme.key}
                    className={`theme-option ${newCapsule.theme === theme.key ? 'selected' : ''}`}
                    style={{ backgroundColor: theme.color }}
                    onClick={() => setNewCapsule((prev) => ({ ...prev, theme: theme.key }))}
                  >
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button className="btn-confirm" onClick={handleCreateCapsule}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加内容弹窗 */}
      {showAddContentModal && (
        <div className="modal-overlay" onClick={() => setShowAddContentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>添加内容</h2>

            <div className="form-group">
              <label>内容类型</label>
              <select
                value={newContent.type}
                onChange={(e) =>
                  setNewContent((prev) => ({ ...prev, type: e.target.value as 'text' | 'image' }))
                }
              >
                <option value="text">文字</option>
                <option value="image">图片链接</option>
              </select>
            </div>

            {newContent.type === 'text' ? (
              <div className="form-group">
                <label>写下你的话</label>
                <textarea
                  value={newContent.text}
                  onChange={(e) => setNewContent((prev) => ({ ...prev, text: e.target.value }))}
                  placeholder="写给未来的自己..."
                  rows={5}
                />
              </div>
            ) : (
              <div className="form-group">
                <label>图片链接</label>
                <input
                  type="text"
                  value={newContent.fileUrl}
                  onChange={(e) => setNewContent((prev) => ({ ...prev, fileUrl: e.target.value }))}
                  placeholder="输入图片URL"
                />
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowAddContentModal(false)}>
                取消
              </button>
              <button className="btn-confirm" onClick={handleAddContent}>
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeCapsulePage;
