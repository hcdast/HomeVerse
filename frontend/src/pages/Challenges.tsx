import { useState, useEffect } from 'react';
import api from '../services/api';
import './Challenges.css';

interface Participant {
  userId: { _id: string; username: string; avatar?: string };
  currentProgress: number;
  isCompleted: boolean;
  streakDays: number;
  points: number;
}

interface Challenge {
  _id: string;
  title: string;
  description?: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  status: 'draft' | 'active' | 'completed' | 'failed' | 'cancelled';
  category: string;
  startDate: string;
  endDate: string;
  targetValue: number;
  unit: string;
  participants: Participant[];
  icon?: string;
  color?: string;
  reward?: string;
  rewardPoints: number;
  isTeamChallenge: boolean;
  teamProgress: number;
  createdBy: { _id: string; username: string };
  createdAt: string;
}

interface Statistics {
  totalChallenges: number;
  activeChallenges: number;
  completedChallenges: number;
  totalPoints: number;
  longestStreak: number;
}

const categoryLabels: Record<string, { label: string; icon: string }> = {
  health: { label: '健康', icon: '💪' },
  learning: { label: '学习', icon: '📚' },
  housework: { label: '家务', icon: '🧹' },
  saving: { label: '储蓄', icon: '💰' },
  exercise: { label: '运动', icon: '🏃' },
  reading: { label: '阅读', icon: '📖' },
  bonding: { label: '家庭联络', icon: '👨‍👩‍👧‍👦' },
  other: { label: '其他', icon: '🎯' },
};

const Challenges = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');

  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    type: 'weekly' as Challenge['type'],
    category: 'health',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    targetValue: 7,
    unit: '次',
    reward: '',
    rewardPoints: 100,
    isTeamChallenge: false,
  });

  const [checkInData, setCheckInData] = useState({
    value: 1,
    notes: '',
  });

  useEffect(() => {
    loadChallenges();
    loadStatistics();
  }, [activeTab]);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const params = activeTab === 'all' ? '' : `?status=${activeTab}`;
      const res = await api.get(`/challenges${params}`);
      setChallenges(res.data.challenges);
    } catch (err) {
      console.error('加载挑战失败', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const res = await api.get('/challenges/statistics');
      setStatistics(res.data);
    } catch (err) {
      console.error('加载统计失败', err);
    }
  };

  const loadChallengeDetail = async (id: string) => {
    try {
      const res = await api.get(`/challenges/${id}`);
      setSelectedChallenge(res.data);
    } catch (err) {
      console.error('加载详情失败', err);
    }
  };

  const handleCreateChallenge = async () => {
    if (!newChallenge.title || !newChallenge.endDate) {
      alert('请填写标题和结束日期');
      return;
    }

    try {
      await api.post('/challenges', newChallenge);
      setShowCreateModal(false);
      setNewChallenge({
        title: '',
        description: '',
        type: 'weekly',
        category: 'health',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        targetValue: 7,
        unit: '次',
        reward: '',
        rewardPoints: 100,
        isTeamChallenge: false,
      });
      loadChallenges();
      loadStatistics();
    } catch (err) {
      console.error('创建失败', err);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedChallenge) return;

    try {
      await api.post(`/challenges/${selectedChallenge._id}/check-in`, checkInData);
      setShowCheckInModal(false);
      setCheckInData({ value: 1, notes: '' });
      loadChallengeDetail(selectedChallenge._id);
      loadChallenges();
      loadStatistics();
    } catch (err) {
      console.error('打卡失败', err);
    }
  };

  const handleJoin = async (id: string) => {
    try {
      await api.post(`/challenges/${id}/join`);
      loadChallenges();
      if (selectedChallenge?._id === id) {
        loadChallengeDetail(id);
      }
    } catch (err) {
      console.error('加入失败', err);
    }
  };

  const handleLeave = async (id: string) => {
    if (!confirm('确定要退出这个挑战吗？')) return;

    try {
      await api.post(`/challenges/${id}/leave`);
      loadChallenges();
      if (selectedChallenge?._id === id) {
        loadChallengeDetail(id);
      }
    } catch (err) {
      console.error('退出失败', err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const getProgressPercent = (current: number, target: number) => {
    return Math.min(100, Math.round((current / target) * 100));
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: '未开始',
      active: '进行中',
      completed: '已完成',
      failed: '未完成',
      cancelled: '已取消',
    };
    return labels[status] || status;
  };

  return (
    <div className="challenges-page">
      <div className="page-header">
        <div className="header-content">
          <h1>🏆 家庭挑战</h1>
          <p>一起挑战，共同成长</p>
        </div>
        <button className="btn-create" onClick={() => setShowCreateModal(true)}>
          🎯 发起挑战
        </button>
      </div>

      {statistics && (
        <div className="stats-cards">
          <div className="stat-card">
            <span className="stat-icon">🔥</span>
            <div className="stat-info">
              <span className="stat-value">{statistics.activeChallenges}</span>
              <span className="stat-label">进行中</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">✅</span>
            <div className="stat-info">
              <span className="stat-value">{statistics.completedChallenges}</span>
              <span className="stat-label">已完成</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">⭐</span>
            <div className="stat-info">
              <span className="stat-value">{statistics.totalPoints}</span>
              <span className="stat-label">总积分</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🔥</span>
            <div className="stat-info">
              <span className="stat-value">{statistics.longestStreak} 天</span>
              <span className="stat-label">最长连续</span>
            </div>
          </div>
        </div>
      )}

      <div className="tabs">
        {(['active', 'completed', 'all'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'active' ? '进行中' : tab === 'completed' ? '已完成' : '全部'}
          </button>
        ))}
      </div>

      <div className="challenges-layout">
        <div className="challenges-list">
          {loading ? (
            <div className="loading">加载中...</div>
          ) : challenges.length === 0 ? (
            <div className="empty">暂无挑战</div>
          ) : (
            challenges.map((challenge) => {
              const category = categoryLabels[challenge.category] || categoryLabels.other;
              const daysLeft = getDaysRemaining(challenge.endDate);

              return (
                <div
                  key={challenge._id}
                  className={`challenge-card ${challenge.status} ${selectedChallenge?._id === challenge._id ? 'selected' : ''}`}
                  onClick={() => loadChallengeDetail(challenge._id)}
                >
                  <div className="challenge-icon" style={{ backgroundColor: challenge.color || '#3b82f6' }}>
                    {challenge.icon || category.icon}
                  </div>
                  <div className="challenge-content">
                    <div className="challenge-header">
                      <h3>{challenge.title}</h3>
                      <span className={`status-badge ${challenge.status}`}>
                        {getStatusLabel(challenge.status)}
                      </span>
                    </div>
                    <div className="challenge-meta">
                      <span>{category.label}</span>
                      <span>目标: {challenge.targetValue} {challenge.unit}</span>
                      {challenge.status === 'active' && <span>{daysLeft} 天剩余</span>}
                    </div>
                    <div className="challenge-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${getProgressPercent(
                              challenge.isTeamChallenge
                                ? challenge.teamProgress
                                : challenge.participants[0]?.currentProgress || 0,
                              challenge.targetValue
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="progress-text">
                        {challenge.isTeamChallenge
                          ? challenge.teamProgress
                          : challenge.participants[0]?.currentProgress || 0}
                        /{challenge.targetValue}
                      </span>
                    </div>
                    <div className="challenge-participants">
                      {challenge.participants.slice(0, 5).map((p, i) => (
                        <div key={i} className="participant-avatar" title={p.userId?.username}>
                          {p.userId?.avatar ? (
                            <img src={p.userId.avatar} alt="" />
                          ) : (
                            <span>{p.userId?.username?.[0]}</span>
                          )}
                        </div>
                      ))}
                      {challenge.participants.length > 5 && (
                        <span className="more-participants">+{challenge.participants.length - 5}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="challenge-detail">
          {selectedChallenge ? (
            <>
              <div className="detail-header">
                <div className="detail-icon" style={{ backgroundColor: selectedChallenge.color || '#3b82f6' }}>
                  {selectedChallenge.icon || categoryLabels[selectedChallenge.category]?.icon || '🎯'}
                </div>
                <div className="detail-title">
                  <h2>{selectedChallenge.title}</h2>
                  <span className={`status-badge ${selectedChallenge.status}`}>
                    {getStatusLabel(selectedChallenge.status)}
                  </span>
                </div>
              </div>

              {selectedChallenge.description && (
                <p className="detail-description">{selectedChallenge.description}</p>
              )}

              <div className="detail-info-grid">
                <div className="info-item">
                  <span className="info-label">类型</span>
                  <span className="info-value">{categoryLabels[selectedChallenge.category]?.label}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">目标</span>
                  <span className="info-value">{selectedChallenge.targetValue} {selectedChallenge.unit}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">时间</span>
                  <span className="info-value">
                    {formatDate(selectedChallenge.startDate)} - {formatDate(selectedChallenge.endDate)}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">奖励</span>
                  <span className="info-value">{selectedChallenge.rewardPoints} 积分</span>
                </div>
              </div>

              {selectedChallenge.status === 'active' && (
                <div className="detail-actions">
                  <button className="btn-checkin" onClick={() => setShowCheckInModal(true)}>
                    ✓ 打卡
                  </button>
                  <button className="btn-leave" onClick={() => handleLeave(selectedChallenge._id)}>
                    退出挑战
                  </button>
                </div>
              )}

              <div className="leaderboard-section">
                <h3>🏅 排行榜</h3>
                <div className="leaderboard-list">
                  {selectedChallenge.participants
                    .sort((a, b) => b.currentProgress - a.currentProgress)
                    .map((p, i) => (
                      <div key={i} className={`leaderboard-item ${p.isCompleted ? 'completed' : ''}`}>
                        <span className="rank">{i + 1}</span>
                        <div className="user-info">
                          <div className="user-avatar">
                            {p.userId?.avatar ? (
                              <img src={p.userId.avatar} alt="" />
                            ) : (
                              <span>{p.userId?.username?.[0]}</span>
                            )}
                          </div>
                          <span className="user-name">{p.userId?.username}</span>
                        </div>
                        <div className="user-stats">
                          <span className="progress">{p.currentProgress}/{selectedChallenge.targetValue}</span>
                          <span className="streak">🔥 {p.streakDays}</span>
                          {p.isCompleted && <span className="completed-badge">✅</span>}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <div className="no-selection-icon">🏆</div>
              <p>选择一个挑战查看详情</p>
            </div>
          )}
        </div>
      </div>

      {/* 创建挑战弹窗 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>发起新挑战</h2>

            <div className="form-group">
              <label>挑战名称</label>
              <input
                type="text"
                value={newChallenge.title}
                onChange={(e) => setNewChallenge((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="例如：每天运动30分钟"
              />
            </div>

            <div className="form-group">
              <label>描述（可选）</label>
              <textarea
                value={newChallenge.description}
                onChange={(e) => setNewChallenge((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="添加挑战说明..."
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>类型</label>
                <select
                  value={newChallenge.category}
                  onChange={(e) => setNewChallenge((prev) => ({ ...prev, category: e.target.value }))}
                >
                  {Object.entries(categoryLabels).map(([key, { label, icon }]) => (
                    <option key={key} value={key}>
                      {icon} {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>周期</label>
                <select
                  value={newChallenge.type}
                  onChange={(e) =>
                    setNewChallenge((prev) => ({ ...prev, type: e.target.value as Challenge['type'] }))
                  }
                >
                  <option value="daily">每日</option>
                  <option value="weekly">每周</option>
                  <option value="monthly">每月</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>目标值</label>
                <input
                  type="number"
                  value={newChallenge.targetValue}
                  onChange={(e) =>
                    setNewChallenge((prev) => ({ ...prev, targetValue: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="form-group">
                <label>单位</label>
                <input
                  type="text"
                  value={newChallenge.unit}
                  onChange={(e) => setNewChallenge((prev) => ({ ...prev, unit: e.target.value }))}
                  placeholder="次"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>开始日期</label>
                <input
                  type="date"
                  value={newChallenge.startDate}
                  onChange={(e) => setNewChallenge((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>结束日期</label>
                <input
                  type="date"
                  value={newChallenge.endDate}
                  onChange={(e) => setNewChallenge((prev) => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label>奖励积分</label>
              <input
                type="number"
                value={newChallenge.rewardPoints}
                onChange={(e) =>
                  setNewChallenge((prev) => ({ ...prev, rewardPoints: parseInt(e.target.value) || 0 }))
                }
              />
            </div>

            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={newChallenge.isTeamChallenge}
                  onChange={(e) =>
                    setNewChallenge((prev) => ({ ...prev, isTeamChallenge: e.target.checked }))
                  }
                />
                团队挑战（合计进度）
              </label>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button className="btn-confirm" onClick={handleCreateChallenge}>
                发起挑战
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 打卡弹窗 */}
      {showCheckInModal && selectedChallenge && (
        <div className="modal-overlay" onClick={() => setShowCheckInModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <h2>打卡</h2>

            <div className="form-group">
              <label>完成数量 ({selectedChallenge.unit})</label>
              <input
                type="number"
                value={checkInData.value}
                onChange={(e) =>
                  setCheckInData((prev) => ({ ...prev, value: parseInt(e.target.value) || 0 }))
                }
                min={1}
              />
            </div>

            <div className="form-group">
              <label>备注（可选）</label>
              <input
                type="text"
                value={checkInData.notes}
                onChange={(e) => setCheckInData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="今天的收获..."
              />
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowCheckInModal(false)}>
                取消
              </button>
              <button className="btn-confirm" onClick={handleCheckIn}>
                确认打卡
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Challenges;
