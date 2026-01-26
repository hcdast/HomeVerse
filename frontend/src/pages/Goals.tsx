import { useState, useEffect } from 'react';
import api from '@/services/api';
import useConfirm from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './Goals.css';

interface FamilyMember {
  _id: string;
  username: string;
  avatar?: string;
}

interface Milestone {
  title: string;
  description?: string;
  isCompleted: boolean;
  completedAt?: string;
  targetDate?: string;
  progress: number;
}

interface GoalUpdate {
  userId: { _id: string; username: string; avatar?: string };
  content: string;
  progress: number;
  images: string[];
  createdAt: string;
}

interface Goal {
  _id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  priority: string;
  startDate: string;
  targetDate?: string;
  completedDate?: string;
  progress: number;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  milestones: Milestone[];
  updates: GoalUpdate[];
  participants: { _id: string; username: string; avatar?: string }[];
  createdBy: { _id: string; username: string };
  coverImage?: string;
  tags: string[];
  isPrivate?: boolean;
}

interface Statistics {
  total: number;
  completed: number;
  inProgress: number;
  completionRate: number;
  byCategory: { category: string; count: number; completed: number }[];
  recentCompleted: Goal[];
}

const categoryOptions = [
  { value: 'finance', label: '财务目标', icon: '💰', color: '#27ae60' },
  { value: 'health', label: '健康目标', icon: '💪', color: '#e74c3c' },
  { value: 'education', label: '学习目标', icon: '📚', color: '#3498db' },
  { value: 'travel', label: '旅行目标', icon: '✈️', color: '#f39c12' },
  { value: 'home', label: '家居目标', icon: '🏠', color: '#9b59b6' },
  { value: 'relationship', label: '家庭关系', icon: '❤️', color: '#e91e63' },
  { value: 'career', label: '职业目标', icon: '💼', color: '#34495e' },
  { value: 'hobby', label: '兴趣爱好', icon: '🎨', color: '#1abc9c' },
  { value: 'custom', label: '自定义', icon: '⭐', color: '#95a5a6' },
];

const statusOptions = [
  { value: 'not_started', label: '未开始', color: '#95a5a6', icon: '⏸️' },
  { value: 'in_progress', label: '进行中', color: '#3498db', icon: '▶️' },
  { value: 'completed', label: '已完成', color: '#27ae60', icon: '✅' },
  { value: 'paused', label: '暂停', color: '#f39c12', icon: '⏯️' },
  { value: 'cancelled', label: '已取消', color: '#e74c3c', icon: '❌' },
];

const priorityOptions = [
  { value: 'low', label: '低', color: '#95a5a6' },
  { value: 'medium', label: '中', color: '#f39c12' },
  { value: 'high', label: '高', color: '#e74c3c' },
];

const Goals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Goal[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [filter, setFilter] = useState('all');
  const [newUpdate, setNewUpdate] = useState({ content: '', progress: 0, currentValue: '' });
  const [newMilestone, setNewMilestone] = useState({ title: '', targetDate: '', description: '' });
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { toast, hideToast, success, error } = useToast();

  const getDefaultFormData = () => ({
    title: '',
    description: '',
    category: 'custom',
    priority: 'medium',
    startDate: new Date().toISOString().split('T')[0],
    targetDate: '',
    targetValue: '',
    unit: '',
    isPrivate: false,
    participants: [] as string[],
  });

  const [formData, setFormData] = useState(getDefaultFormData());

  useEffect(() => {
    loadData();
    loadFamilyMembers();
  }, []);

  const loadData = async () => {
    try {
      const [allRes, activeRes, statsRes, deadlinesRes] = await Promise.all([
        api.get('/goals'),
        api.get('/goals/active'),
        api.get('/goals/statistics'),
        api.get('/goals/upcoming-deadlines?days=14'),
      ]);
      setGoals(Array.isArray(allRes.data) ? allRes.data : []);
      setActiveGoals(Array.isArray(activeRes.data) ? activeRes.data : []);
      setStatistics(statsRes.data);
      setUpcomingDeadlines(Array.isArray(deadlinesRes.data) ? deadlinesRes.data : []);
    } catch (err) {
      console.error('加载数据失败:', err);
    }
  };

  const loadFamilyMembers = async () => {
    try {
      const res = await api.get('/users/family-members');
      setFamilyMembers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('加载家庭成员失败:', err);
    }
  };

  const handleOpenCreate = () => {
    setFormData(getDefaultFormData());
    setShowCreateModal(true);
  };

  const handleOpenEdit = () => {
    if (!selectedGoal) return;
    setFormData({
      title: selectedGoal.title,
      description: selectedGoal.description || '',
      category: selectedGoal.category,
      priority: selectedGoal.priority,
      startDate: selectedGoal.startDate ? new Date(selectedGoal.startDate).toISOString().split('T')[0] : '',
      targetDate: selectedGoal.targetDate ? new Date(selectedGoal.targetDate).toISOString().split('T')[0] : '',
      targetValue: selectedGoal.targetValue?.toString() || '',
      unit: selectedGoal.unit || '',
      isPrivate: selectedGoal.isPrivate || false,
      participants: selectedGoal.participants?.map(p => p._id) || [],
    });
    setShowEditModal(true);
  };

  const handleCreate = async () => {
    if (!formData.title) {
      error('请填写目标标题');
      return;
    }

    try {
      await api.post('/goals', {
        ...formData,
        targetValue: formData.targetValue ? parseFloat(formData.targetValue) : undefined,
      });
      setShowCreateModal(false);
      setFormData(getDefaultFormData());
      success('创建成功');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '创建失败');
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedGoal || !formData.title) {
      error('请填写目标标题');
      return;
    }

    try {
      await api.put(`/goals/${selectedGoal._id}`, {
        ...formData,
        targetValue: formData.targetValue ? parseFloat(formData.targetValue) : undefined,
      });
      setShowEditModal(false);
      success('保存成功');
      // 刷新详情
      const res = await api.get(`/goals/${selectedGoal._id}`);
      setSelectedGoal(res.data);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '保存失败');
    }
  };

  const handleUpdateProgress = async () => {
    if (!selectedGoal || !newUpdate.content) {
      error('请填写更新内容');
      return;
    }

    try {
      await api.post(`/goals/${selectedGoal._id}/progress`, {
        content: newUpdate.content,
        progress: newUpdate.progress,
        currentValue: newUpdate.currentValue ? parseFloat(newUpdate.currentValue) : undefined,
      });
      setNewUpdate({ content: '', progress: selectedGoal.progress, currentValue: '' });
      success('更新成功');
      // 刷新详情
      const res = await api.get(`/goals/${selectedGoal._id}`);
      setSelectedGoal(res.data);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '更新失败');
    }
  };

  const handleAddMilestone = async () => {
    if (!selectedGoal || !newMilestone.title) {
      error('请填写里程碑标题');
      return;
    }

    try {
      await api.post(`/goals/${selectedGoal._id}/milestones`, {
        title: newMilestone.title,
        description: newMilestone.description || undefined,
        targetDate: newMilestone.targetDate || undefined,
      });
      setNewMilestone({ title: '', targetDate: '', description: '' });
      success('添加成功');
      const res = await api.get(`/goals/${selectedGoal._id}`);
      setSelectedGoal(res.data);
    } catch (err: any) {
      error(err.response?.data?.message || '添加失败');
    }
  };

  const handleCompleteMilestone = async (index: number) => {
    if (!selectedGoal) return;

    try {
      await api.put(`/goals/${selectedGoal._id}/milestones/${index}/complete`);
      const res = await api.get(`/goals/${selectedGoal._id}`);
      setSelectedGoal(res.data);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const handleDeleteMilestone = async (index: number) => {
    if (!selectedGoal) return;

    const confirmed = await confirm({
      title: '删除里程碑',
      message: '确定要删除此里程碑吗？',
      confirmText: '删除',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/goals/${selectedGoal._id}/milestones/${index}`);
      const res = await api.get(`/goals/${selectedGoal._id}`);
      setSelectedGoal(res.data);
    } catch (err: any) {
      error(err.response?.data?.message || '删除失败');
    }
  };

  const handleUpdateStatus = async (goalId: string, status: string) => {
    try {
      await api.put(`/goals/${goalId}/status`, { status });
      success('状态已更新');
      loadData();
      if (selectedGoal?._id === goalId) {
        const res = await api.get(`/goals/${goalId}`);
        setSelectedGoal(res.data);
      }
    } catch (err: any) {
      error(err.response?.data?.message || '更新失败');
    }
  };

  const handleAddParticipant = async (userId: string) => {
    if (!selectedGoal) return;

    try {
      await api.post(`/goals/${selectedGoal._id}/participants`, { userId });
      const res = await api.get(`/goals/${selectedGoal._id}`);
      setSelectedGoal(res.data);
      success('已添加参与者');
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const handleRemoveParticipant = async (userId: string) => {
    if (!selectedGoal) return;

    try {
      await api.delete(`/goals/${selectedGoal._id}/participants/${userId}`);
      const res = await api.get(`/goals/${selectedGoal._id}`);
      setSelectedGoal(res.data);
      success('已移除参与者');
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '删除目标',
      message: '确定要删除此目标吗？所有相关进度记录也将被删除。',
      confirmText: '删除',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/goals/${id}`);
      success('已删除');
      setShowDetailModal(false);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '删除失败');
    }
  };

  const toggleParticipant = (userId: string) => {
    const current = formData.participants;
    if (current.includes(userId)) {
      setFormData({ ...formData, participants: current.filter(id => id !== userId) });
    } else {
      setFormData({ ...formData, participants: [...current, userId] });
    }
  };

  const getCategoryInfo = (category: string) => {
    return categoryOptions.find((c) => c.value === category) || categoryOptions[8];
  };

  const getStatusInfo = (status: string) => {
    return statusOptions.find((s) => s.value === status) || statusOptions[0];
  };

  const _getPriorityInfo = (priority: string) => {
    return priorityOptions.find((p) => p.value === priority) || priorityOptions[1];
  };
  // Note: _getPriorityInfo is available for future use
  void _getPriorityInfo;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCountdown = (targetDate: string) => {
    const target = new Date(targetDate);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    
    if (diff < 0) return { text: '已过期', urgent: true };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return { text: '今天到期', urgent: true };
    if (days === 1) return { text: '明天到期', urgent: true };
    if (days <= 7) return { text: `${days}天后到期`, urgent: true };
    if (days <= 30) return { text: `${days}天后`, urgent: false };
    
    const months = Math.floor(days / 30);
    return { text: `${months}个月后`, urgent: false };
  };

  const getDaysRemaining = (targetDate: string) => {
    const target = new Date(targetDate);
    const now = new Date();
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const openDetail = async (goal: Goal) => {
    try {
      const res = await api.get(`/goals/${goal._id}`);
      setSelectedGoal(res.data);
      setNewUpdate({ content: '', progress: res.data.progress, currentValue: res.data.currentValue?.toString() || '' });
      setShowDetailModal(true);
    } catch (err) {
      error('加载详情失败');
    }
  };

  const filteredGoals = goals.filter((g) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['not_started', 'in_progress'].includes(g.status);
    if (filter === 'completed') return g.status === 'completed';
    return g.category === filter;
  });

  const renderGoalForm = (isEdit = false) => (
    <>
      <div className="form-group">
        <label>分类</label>
        <div className="category-grid">
          {categoryOptions.map((cat) => (
            <button
              key={cat.value}
              className={`category-btn ${formData.category === cat.value ? 'active' : ''}`}
              style={{
                borderColor: formData.category === cat.value ? cat.color : 'transparent',
              }}
              onClick={() => setFormData({ ...formData, category: cat.value })}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>目标标题 *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="如：全家出国旅行、存款10万元"
        />
      </div>

      <div className="form-group">
        <label>描述（可选）</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="目标的详细说明"
          rows={3}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>开始日期</label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>目标日期（可选）</label>
          <input
            type="date"
            value={formData.targetDate}
            onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>目标值（可选）</label>
          <input
            type="number"
            value={formData.targetValue}
            onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
            placeholder="如 100000"
          />
        </div>
        <div className="form-group">
          <label>单位</label>
          <input
            type="text"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            placeholder="如 元、公里、本"
          />
        </div>
      </div>

      <div className="form-group">
        <label>优先级</label>
        <div className="priority-selector">
          {priorityOptions.map((p) => (
            <button
              key={p.value}
              className={formData.priority === p.value ? 'active' : ''}
              style={{ borderColor: formData.priority === p.value ? p.color : 'transparent' }}
              onClick={() => setFormData({ ...formData, priority: p.value })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {familyMembers.length > 0 && (
        <div className="form-group">
          <label>参与者</label>
          <div className="participant-selector">
            {familyMembers.map((member) => (
              <button
                key={member._id}
                className={`participant-btn ${formData.participants.includes(member._id) ? 'active' : ''}`}
                onClick={() => toggleParticipant(member._id)}
              >
                <span className="participant-avatar">
                  {member.avatar ? <img src={member.avatar} alt="" /> : member.username.charAt(0)}
                </span>
                <span>{member.username}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.isPrivate}
            onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
          />
          设为私密目标（仅自己可见）
        </label>
      </div>

      <div className="modal-actions">
        <button type="button" onClick={() => isEdit ? setShowEditModal(false) : setShowCreateModal(false)}>取消</button>
        <button type="submit" onClick={isEdit ? handleSaveEdit : handleCreate}>
          {isEdit ? '保存' : '创建'}
        </button>
      </div>
    </>
  );

  return (
    <div className="goals-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">🎯 家庭目标</h1>
          <p className="page-subtitle">共同追踪，一起达成</p>
        </div>
        <button className="btn-primary" onClick={handleOpenCreate}>
          + 新建目标
        </button>
      </div>

      {/* 统计卡片 */}
      {statistics && (
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-value">{statistics.total}</div>
            <div className="stat-label">总目标</div>
          </div>
          <div className="stat-card active">
            <div className="stat-value">{statistics.inProgress}</div>
            <div className="stat-label">进行中</div>
          </div>
          <div className="stat-card completed">
            <div className="stat-value">{statistics.completed}</div>
            <div className="stat-label">已完成</div>
          </div>
          <div className="stat-card rate">
            <div className="stat-value">{statistics.completionRate}%</div>
            <div className="stat-label">完成率</div>
            <div className="stat-bar">
              <div className="stat-bar-fill" style={{ width: `${statistics.completionRate}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* 即将到期 */}
      {upcomingDeadlines.length > 0 && (
        <div className="deadlines-section">
          <h3>⏰ 即将到期</h3>
          <div className="deadlines-list">
            {upcomingDeadlines.slice(0, 4).map((goal) => {
              const catInfo = getCategoryInfo(goal.category);
              const countdown = goal.targetDate ? getCountdown(goal.targetDate) : null;
              return (
                <div
                  key={goal._id}
                  className={`deadline-card ${countdown?.urgent ? 'urgent' : ''}`}
                  onClick={() => openDetail(goal)}
                >
                  <span className="deadline-icon">{catInfo.icon}</span>
                  <div className="deadline-info">
                    <h4>{goal.title}</h4>
                    <div className="deadline-progress">
                      <div className="progress-bar mini">
                        <div className="progress-fill" style={{ width: `${goal.progress}%`, backgroundColor: catInfo.color }} />
                      </div>
                      <span>{goal.progress}%</span>
                    </div>
                  </div>
                  {countdown && (
                    <span className={`deadline-time ${countdown.urgent ? 'urgent' : ''}`}>
                      {countdown.text}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 活跃目标 */}
      {activeGoals.length > 0 && (
        <div className="active-section">
          <h3>🚀 活跃目标</h3>
          <div className="active-goals">
            {activeGoals.slice(0, 3).map((goal) => {
              const catInfo = getCategoryInfo(goal.category);
              const daysRemaining = goal.targetDate ? getDaysRemaining(goal.targetDate) : null;
              return (
                <div
                  key={goal._id}
                  className="active-goal-card"
                  style={{ borderColor: catInfo.color }}
                  onClick={() => openDetail(goal)}
                >
                  <div className="goal-icon">{catInfo.icon}</div>
                  <div className="goal-info">
                    <h4>{goal.title}</h4>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${goal.progress}%`, backgroundColor: catInfo.color }}
                      />
                    </div>
                    <div className="goal-stats">
                      <span className="progress-text">{goal.progress}%</span>
                      {daysRemaining !== null && daysRemaining > 0 && (
                        <span className="days-remaining">剩余 {daysRemaining} 天</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 过滤器 */}
      <div className="filter-section">
        <div className="filter-tabs">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
            全部
          </button>
          <button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>
            进行中
          </button>
          <button className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>
            已完成
          </button>
          <div className="filter-divider" />
          {categoryOptions.map((cat) => (
            <button
              key={cat.value}
              className={filter === cat.value ? 'active' : ''}
              onClick={() => setFilter(cat.value)}
              title={cat.label}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      </div>

      {/* 目标列表 */}
      <div className="goals-grid">
        {filteredGoals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <p>还没有目标，创建第一个吧</p>
          </div>
        ) : (
          filteredGoals.map((goal) => {
            const catInfo = getCategoryInfo(goal.category);
            const statusInfo = getStatusInfo(goal.status);
            const countdown = goal.targetDate ? getCountdown(goal.targetDate) : null;
            return (
              <div
                key={goal._id}
                className="goal-card"
                onClick={() => openDetail(goal)}
              >
                <div className="card-header" style={{ backgroundColor: catInfo.color }}>
                  <span className="card-icon">{catInfo.icon}</span>
                  <span className="card-category">{catInfo.label}</span>
                  <span className="card-status" style={{ backgroundColor: statusInfo.color }}>
                    {statusInfo.label}
                  </span>
                </div>
                <div className="card-body">
                  <h4>{goal.title}</h4>
                  {goal.description && <p className="card-desc">{goal.description}</p>}
                  <div className="card-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${goal.progress}%`, backgroundColor: catInfo.color }}
                      />
                    </div>
                    <span>{goal.progress}%</span>
                  </div>
                  {goal.targetValue && (
                    <div className="card-value">
                      {(goal.currentValue || 0).toLocaleString()} / {goal.targetValue.toLocaleString()} {goal.unit}
                    </div>
                  )}
                  {countdown && (
                    <div className={`card-countdown ${countdown.urgent ? 'urgent' : ''}`}>
                      ⏱️ {countdown.text}
                    </div>
                  )}
                  <div className="card-footer">
                    <div className="participants-row">
                      {goal.participants.slice(0, 3).map((p, i) => (
                        <div key={i} className="participant-avatar" title={p.username}>
                          {p.avatar ? <img src={p.avatar} alt="" /> : p.username.charAt(0)}
                        </div>
                      ))}
                      {goal.participants.length > 3 && (
                        <span className="more-participants">+{goal.participants.length - 3}</span>
                      )}
                    </div>
                    {goal.milestones.length > 0 && (
                      <span className="milestone-count">
                        🏁 {goal.milestones.filter(m => m.isCompleted).length}/{goal.milestones.length}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 创建模态框 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>新建目标</h2>
            {renderGoalForm(false)}
          </div>
        </div>
      )}

      {/* 编辑模态框 */}
      {showEditModal && selectedGoal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>编辑目标</h2>
            {renderGoalForm(true)}
          </div>
        </div>
      )}

      {/* 详情模态框 */}
      {showDetailModal && selectedGoal && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-detail" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header" style={{ backgroundColor: getCategoryInfo(selectedGoal.category).color }}>
              <span className="detail-icon">{getCategoryInfo(selectedGoal.category).icon}</span>
              <div className="detail-title-section">
                <h2>{selectedGoal.title}</h2>
                {selectedGoal.targetDate && (
                  <span className="detail-countdown">
                    {getCountdown(selectedGoal.targetDate).text}
                  </span>
                )}
              </div>
              <div className="detail-progress">
                <div className="progress-circle">
                  <svg viewBox="0 0 36 36">
                    <path
                      className="circle-bg"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="circle-fill"
                      strokeDasharray={`${selectedGoal.progress}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span>{selectedGoal.progress}%</span>
                </div>
              </div>
            </div>

            <div className="detail-body">
              {/* 状态选择 */}
              <div className="status-selector">
                {statusOptions.map((s) => (
                  <button
                    key={s.value}
                    className={selectedGoal.status === s.value ? 'active' : ''}
                    style={{ backgroundColor: selectedGoal.status === s.value ? s.color : '' }}
                    onClick={() => handleUpdateStatus(selectedGoal._id, s.value)}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>

              {/* 目标值进度 */}
              {selectedGoal.targetValue && (
                <div className="value-progress">
                  <div className="value-header">
                    <span>进度</span>
                    <span>{(selectedGoal.currentValue || 0).toLocaleString()} / {selectedGoal.targetValue.toLocaleString()} {selectedGoal.unit}</span>
                  </div>
                  <div className="progress-bar large">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${Math.min(100, ((selectedGoal.currentValue || 0) / selectedGoal.targetValue) * 100)}%`,
                        backgroundColor: getCategoryInfo(selectedGoal.category).color 
                      }} 
                    />
                  </div>
                </div>
              )}

              {/* 参与者管理 */}
              <div className="detail-section">
                <h4>👥 参与者</h4>
                <div className="participants-manager">
                  {selectedGoal.participants.length > 0 ? (
                    <div className="current-participants">
                      {selectedGoal.participants.map((p) => (
                        <div key={p._id} className="participant-tag">
                          <span className="participant-avatar">
                            {p.avatar ? <img src={p.avatar} alt="" /> : p.username.charAt(0)}
                          </span>
                          <span>{p.username}</span>
                          <button onClick={() => handleRemoveParticipant(p._id)}>×</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-text">暂无参与者</p>
                  )}
                  {familyMembers.filter(m => !selectedGoal.participants.find(p => p._id === m._id)).length > 0 && (
                    <div className="add-participant">
                      <span>添加：</span>
                      {familyMembers
                        .filter(m => !selectedGoal.participants.find(p => p._id === m._id))
                        .map((m) => (
                          <button key={m._id} onClick={() => handleAddParticipant(m._id)}>
                            + {m.username}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 里程碑 */}
              <div className="detail-section">
                <h4>🏁 里程碑</h4>
                {selectedGoal.milestones.length === 0 ? (
                  <p className="empty-text">暂无里程碑</p>
                ) : (
                  <div className="milestones-list">
                    {selectedGoal.milestones.map((m, i) => (
                      <div key={i} className={`milestone-item ${m.isCompleted ? 'completed' : ''}`}>
                        <button
                          className="milestone-check"
                          onClick={() => !m.isCompleted && handleCompleteMilestone(i)}
                        >
                          {m.isCompleted ? '✓' : '○'}
                        </button>
                        <div className="milestone-content">
                          <span className="milestone-title">{m.title}</span>
                          {m.description && <span className="milestone-desc">{m.description}</span>}
                        </div>
                        {m.targetDate && <span className="milestone-date">{formatDate(m.targetDate)}</span>}
                        <button className="milestone-delete" onClick={() => handleDeleteMilestone(i)}>
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="add-milestone">
                  <input
                    type="text"
                    value={newMilestone.title}
                    onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                    placeholder="添加里程碑..."
                  />
                  <input
                    type="date"
                    value={newMilestone.targetDate}
                    onChange={(e) => setNewMilestone({ ...newMilestone, targetDate: e.target.value })}
                  />
                  <button onClick={handleAddMilestone}>添加</button>
                </div>
              </div>

              {/* 进度更新 */}
              <div className="detail-section">
                <h4>📝 更新进度</h4>
                <div className="update-form">
                  <textarea
                    value={newUpdate.content}
                    onChange={(e) => setNewUpdate({ ...newUpdate, content: e.target.value })}
                    placeholder="记录你的进展..."
                    rows={2}
                  />
                  <div className="update-controls">
                    <div className="update-progress">
                      <label>进度: {newUpdate.progress}%</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={newUpdate.progress}
                        onChange={(e) => setNewUpdate({ ...newUpdate, progress: parseInt(e.target.value) })}
                      />
                    </div>
                    {selectedGoal.targetValue && (
                      <div className="update-value">
                        <label>当前值</label>
                        <input
                          type="number"
                          value={newUpdate.currentValue}
                          onChange={(e) => setNewUpdate({ ...newUpdate, currentValue: e.target.value })}
                          placeholder={`${selectedGoal.unit}`}
                        />
                      </div>
                    )}
                  </div>
                  <button className="btn-submit" onClick={handleUpdateProgress}>提交更新</button>
                </div>

                {/* 历史更新 */}
                {selectedGoal.updates.length > 0 && (
                  <div className="updates-list">
                    <h5>历史记录</h5>
                    {selectedGoal.updates.slice().reverse().map((update, i) => (
                      <div key={i} className="update-item">
                        <div className="update-header">
                          <span className="update-author">
                            <span className="author-avatar">
                              {update.userId?.avatar ? <img src={update.userId.avatar} alt="" /> : update.userId?.username?.charAt(0)}
                            </span>
                            {update.userId?.username}
                          </span>
                          <span className="update-time">{formatDate(update.createdAt)}</span>
                          <span className="update-progress-badge">{update.progress}%</span>
                        </div>
                        <p>{update.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="detail-footer">
              <button className="btn-delete" onClick={() => handleDelete(selectedGoal._id)}>
                🗑️ 删除
              </button>
              <button className="btn-edit" onClick={handleOpenEdit}>
                ✏️ 编辑
              </button>
              <button onClick={() => setShowDetailModal(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialogComponent}
    </div>
  );
};

export default Goals;
