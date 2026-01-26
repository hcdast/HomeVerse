import { useState, useEffect } from 'react';
import api from '@/services/api';
import useConfirm from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './Chores.css';

interface User {
  _id: string;
  username: string;
  avatar?: string;
}

interface ChoreCompletion {
  completedBy: User;
  completedAt: string;
  rating?: number;
  notes?: string;
  pointsEarned: number;
}

interface Chore {
  _id: string;
  name: string;
  description?: string;
  category: string;
  frequency: string;
  assignedTo?: User;
  rotationEnabled: boolean;
  rotationMembers: User[];
  dueDate?: string;
  dueTime?: string;
  points: number;
  status: string;
  completionHistory: ChoreCompletion[];
  lastCompletedAt?: string;
  nextDueDate?: string;
  createdBy?: User;
  icon?: string;
}

interface LeaderboardItem {
  userId: string;
  username: string;
  avatar?: string;
  completedCount: number;
  totalPoints: number;
}

interface Statistics {
  total: number;
  pending: number;
  completedToday: number;
  completedThisWeek: number;
  byCategory: { category: string; count: number }[];
}

const categoryLabels: Record<string, { label: string; icon: string }> = {
  cleaning: { label: '清洁', icon: '🧹' },
  cooking: { label: '烹饪', icon: '🍳' },
  laundry: { label: '洗衣', icon: '🧺' },
  organizing: { label: '整理', icon: '📦' },
  shopping: { label: '采购', icon: '🛒' },
  maintenance: { label: '维护', icon: '🔧' },
  pet_care: { label: '宠物', icon: '🐾' },
  other: { label: '其他', icon: '📌' },
};

const frequencyLabels: Record<string, string> = {
  once: '一次性',
  daily: '每天',
  weekly: '每周',
  biweekly: '每两周',
  monthly: '每月',
};

const Chores = () => {
  const [chores, setChores] = useState<Chore[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'today'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState<string | null>(null);
  const [completeData, setCompleteData] = useState({ rating: 5, notes: '' });
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { toast, hideToast, success, error } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other',
    frequency: 'once',
    assignedTo: '',
    rotationEnabled: false,
    rotationMembers: [] as string[],
    points: 10,
    dueDate: '',
    dueTime: '',
  });

  useEffect(() => {
    loadData();
    loadFamilyMembers();
  }, [activeTab]);

  const loadData = async () => {
    try {
      let choresEndpoint = '/chores';
      if (activeTab === 'my') {
        choresEndpoint = '/chores/my-chores';
      } else if (activeTab === 'today') {
        choresEndpoint = '/chores/today';
      }

      const [choresRes, leaderboardRes, statsRes] = await Promise.all([
        api.get(choresEndpoint),
        api.get('/chores/leaderboard'),
        api.get('/chores/statistics'),
      ]);

      setChores(Array.isArray(choresRes.data) ? choresRes.data : []);
      setLeaderboard(Array.isArray(leaderboardRes.data) ? leaderboardRes.data : []);
      setStatistics(statsRes.data);
    } catch (err) {
      console.error('加载数据失败:', err);
      setChores([]);
    }
  };

  const loadFamilyMembers = async () => {
    try {
      const res = await api.get('/users/family-members');
      setFamilyMembers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('加载成员失败:', err);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      error('请输入家务名称');
      return;
    }

    try {
      await api.post('/chores', {
        ...formData,
        points: parseInt(formData.points.toString()) || 10,
        rotationMembers: formData.rotationEnabled ? formData.rotationMembers : [],
      });
      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        category: 'other',
        frequency: 'once',
        assignedTo: '',
        rotationEnabled: false,
        rotationMembers: [],
        points: 10,
        dueDate: '',
        dueTime: '',
      });
      success('创建成功');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '创建失败');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await api.put(`/chores/${id}/complete`, completeData);
      setShowCompleteModal(null);
      setCompleteData({ rating: 5, notes: '' });
      success('太棒了！家务已完成 🎉');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const handleSkip = async (id: string) => {
    const confirmed = await confirm({
      title: '跳过家务',
      message: '确定要跳过此次家务吗？',
      confirmText: '跳过',
      type: 'warning',
    });
    if (!confirmed) return;

    try {
      await api.put(`/chores/${id}/skip`);
      success('已跳过');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '删除家务',
      message: '确定要删除此家务吗？此操作不可恢复。',
      confirmText: '删除',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/chores/${id}`);
      success('已删除');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '删除失败');
    }
  };

  const toggleRotationMember = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      rotationMembers: prev.rotationMembers.includes(userId)
        ? prev.rotationMembers.filter((id) => id !== userId)
        : [...prev.rotationMembers, userId],
    }));
  };

  return (
    <div className="chores-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">🧹 家务分工</h1>
          <p className="page-subtitle">合理分配家务，让家庭更和谐</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + 添加家务
        </button>
      </div>

      <div className="chores-layout">
        {/* 左侧主内容 */}
        <div className="chores-main">
          {/* 统计卡片 */}
          {statistics && (
            <div className="stats-cards">
              <div className="stat-card">
                <div className="stat-icon">📋</div>
                <div className="stat-info">
                  <div className="stat-number">{statistics.total}</div>
                  <div className="stat-label">全部家务</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⏳</div>
                <div className="stat-info">
                  <div className="stat-number">{statistics.pending}</div>
                  <div className="stat-label">待完成</div>
                </div>
              </div>
              <div className="stat-card highlight">
                <div className="stat-icon">🌟</div>
                <div className="stat-info">
                  <div className="stat-number">{statistics.completedToday}</div>
                  <div className="stat-label">今日完成</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <div className="stat-number">{statistics.completedThisWeek}</div>
                  <div className="stat-label">本周完成</div>
                </div>
              </div>
            </div>
          )}

          {/* 标签页 */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              全部家务
            </button>
            <button
              className={`tab ${activeTab === 'my' ? 'active' : ''}`}
              onClick={() => setActiveTab('my')}
            >
              我的任务
            </button>
            <button
              className={`tab ${activeTab === 'today' ? 'active' : ''}`}
              onClick={() => setActiveTab('today')}
            >
              今日待办
            </button>
          </div>

          {/* 家务列表 */}
          <div className="chores-list">
            {chores.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏠</div>
                <p>暂无家务任务</p>
              </div>
            ) : (
              chores.map((chore) => (
                <div key={chore._id} className={`chore-card ${chore.status}`}>
                  <div className="chore-header">
                    <span className="chore-icon">
                      {chore.icon || categoryLabels[chore.category]?.icon || '📌'}
                    </span>
                    <div className="chore-title">
                      <h3>{chore.name}</h3>
                      <span className="chore-category">
                        {categoryLabels[chore.category]?.label || chore.category}
                      </span>
                    </div>
                    <div className="chore-points">
                      <span className="points-value">{chore.points}</span>
                      <span className="points-label">积分</span>
                    </div>
                  </div>

                  {chore.description && (
                    <p className="chore-description">{chore.description}</p>
                  )}

                  <div className="chore-meta">
                    <span className="meta-item">
                      🔄 {frequencyLabels[chore.frequency]}
                    </span>
                    {chore.assignedTo && (
                      <span className="meta-item assigned">
                        👤 {chore.assignedTo.username}
                      </span>
                    )}
                    {chore.rotationEnabled && (
                      <span className="meta-item rotation">
                        🔃 轮换制 ({chore.rotationMembers.length}人)
                      </span>
                    )}
                    {chore.nextDueDate && (
                      <span className="meta-item due">
                        📅 {new Date(chore.nextDueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {chore.completionHistory.length > 0 && (
                    <div className="recent-completions">
                      <span className="completion-label">最近完成：</span>
                      {chore.completionHistory.slice(-3).reverse().map((c, i) => (
                        <span key={i} className="completion-item">
                          {c.completedBy?.username} ({new Date(c.completedAt).toLocaleDateString()})
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="chore-actions">
                    {chore.status !== 'completed' && (
                      <>
                        <button
                          className="btn-complete"
                          onClick={() => setShowCompleteModal(chore._id)}
                        >
                          ✓ 完成
                        </button>
                        <button className="btn-skip" onClick={() => handleSkip(chore._id)}>
                          跳过
                        </button>
                      </>
                    )}
                    <button className="btn-delete" onClick={() => handleDelete(chore._id)}>
                      删除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 右侧排行榜 */}
        <div className="chores-sidebar">
          <div className="leaderboard-card">
            <h3>🏆 家务排行榜</h3>
            {leaderboard.length === 0 ? (
              <p className="no-data">暂无数据</p>
            ) : (
              <div className="leaderboard-list">
                {leaderboard.map((item, index) => (
                  <div key={item.userId} className={`leaderboard-item rank-${index + 1}`}>
                    <span className="rank">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </span>
                    <div className="user-info">
                      <span className="username">{item.username}</span>
                      <span className="completed-count">{item.completedCount} 次</span>
                    </div>
                    <span className="total-points">{item.totalPoints} 分</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 创建模态框 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>添加家务</h2>
            <div className="form-group">
              <label>家务名称 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：打扫客厅、洗碗"
              />
            </div>
            <div className="form-group">
              <label>描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="家务的具体要求"
                rows={2}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>分类</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {Object.entries(categoryLabels).map(([key, { label, icon }]) => (
                    <option key={key} value={key}>
                      {icon} {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>频率</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                >
                  <option value="once">一次性</option>
                  <option value="daily">每天</option>
                  <option value="weekly">每周</option>
                  <option value="biweekly">每两周</option>
                  <option value="monthly">每月</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>积分奖励</label>
                <input
                  type="number"
                  min="1"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 10 })}
                />
              </div>
              <div className="form-group">
                <label>分配给</label>
                <select
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  disabled={formData.rotationEnabled}
                >
                  <option value="">不指定</option>
                  {familyMembers.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.rotationEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, rotationEnabled: e.target.checked, assignedTo: '' })
                  }
                />
                开启轮换制（成员轮流完成）
              </label>
            </div>
            {formData.rotationEnabled && (
              <div className="form-group">
                <label>参与轮换的成员</label>
                <div className="member-checkboxes">
                  {familyMembers.map((m) => (
                    <label key={m._id} className="member-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.rotationMembers.includes(m._id)}
                        onChange={() => toggleRotationMember(m._id)}
                      />
                      {m.username}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="modal-actions">
              <button type="button" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button type="submit" onClick={handleCreate}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 完成确认模态框 */}
      {showCompleteModal && (
        <div className="modal-overlay" onClick={() => setShowCompleteModal(null)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <h2>🎉 完成家务</h2>
            <div className="form-group">
              <label>完成评分</label>
              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`star ${completeData.rating >= star ? 'active' : ''}`}
                    onClick={() => setCompleteData({ ...completeData, rating: star })}
                  >
                    ⭐
                  </span>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>备注（可选）</label>
              <textarea
                value={completeData.notes}
                onChange={(e) => setCompleteData({ ...completeData, notes: e.target.value })}
                placeholder="添加一些备注..."
                rows={2}
              />
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowCompleteModal(null)}>
                取消
              </button>
              <button type="submit" onClick={() => handleComplete(showCompleteModal)}>
                确认完成
              </button>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialogComponent}
    </div>
  );
};

export default Chores;

