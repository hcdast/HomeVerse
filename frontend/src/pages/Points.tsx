import { useState, useEffect } from 'react';
import api from '@/services/api';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import useConfirm from '@/hooks/useConfirm';
import './Points.css';

interface User {
  _id: string;
  username: string;
  avatar?: string;
}

interface PointBalance {
  _id: string;
  userId: User | string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  level: number;
  title: string;
}

interface PointRecord {
  _id: string;
  type: 'earn' | 'spend';
  source: string;
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
}

interface Reward {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  cost: number;
  stock: number;
  isActive: boolean;
  redeemCount: number;
}

interface Redemption {
  _id: string;
  rewardName: string;
  cost: number;
  status: string;
  createdAt: string;
}

interface LeaderboardItem {
  userId: User;
  balance: number;
  totalEarned: number;
  level: number;
  title: string;
}

const sourceLabels: Record<string, { label: string; icon: string }> = {
  chore: { label: '家务', icon: '🧹' },
  todo: { label: '待办', icon: '✅' },
  goal: { label: '目标', icon: '🎯' },
  challenge: { label: '挑战', icon: '🏆' },
  reward: { label: '奖励', icon: '🎁' },
  redeem: { label: '兑换', icon: '🛍️' },
  bonus: { label: '额外', icon: '⭐' },
  penalty: { label: '惩罚', icon: '⚠️' },
  transfer_in: { label: '收到', icon: '📥' },
  transfer_out: { label: '转出', icon: '📤' },
};

const Points = () => {
  const [balance, setBalance] = useState<PointBalance | null>(null);
  const [history, setHistory] = useState<PointRecord[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'rewards' | 'redeem'>('overview');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [transferData, setTransferData] = useState({ toUserId: '', amount: '', description: '' });
  const [rewardData, setRewardData] = useState({ name: '', description: '', icon: '🎁', cost: 100, stock: -1 });
  const { toast, hideToast, success, error } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [balanceRes, historyRes, rewardsRes, leaderboardRes, membersRes] = await Promise.all([
        api.get('/points/balance'),
        api.get('/points/history'),
        api.get('/points/rewards'),
        api.get('/points/leaderboard'),
        api.get('/users/family-members'),
      ]);

      setBalance(balanceRes.data);
      setHistory(historyRes.data.records || []);
      setRewards(Array.isArray(rewardsRes.data) ? rewardsRes.data : []);
      setLeaderboard(Array.isArray(leaderboardRes.data) ? leaderboardRes.data : []);
      setFamilyMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
    } catch (err) {
      console.error('加载数据失败:', err);
    }
  };

  const loadRedemptions = async () => {
    try {
      const res = await api.get('/points/redemptions');
      setRedemptions(res.data.records || []);
    } catch (err) {
      console.error('加载兑换记录失败:', err);
    }
  };

  const handleTransfer = async () => {
    if (!transferData.toUserId || !transferData.amount) {
      error('请填写完整信息');
      return;
    }

    const amount = parseInt(transferData.amount);
    if (isNaN(amount) || amount <= 0) {
      error('请输入有效金额');
      return;
    }

    try {
      await api.post('/points/transfer', {
        toUserId: transferData.toUserId,
        amount,
        description: transferData.description || '积分转账',
      });
      success('转账成功');
      setShowTransferModal(false);
      setTransferData({ toUserId: '', amount: '', description: '' });
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '转账失败');
    }
  };

  const handleCreateReward = async () => {
    if (!rewardData.name || rewardData.cost <= 0) {
      error('请填写完整信息');
      return;
    }

    try {
      await api.post('/points/rewards', rewardData);
      success('奖励创建成功');
      setShowRewardModal(false);
      setRewardData({ name: '', description: '', icon: '🎁', cost: 100, stock: -1 });
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '创建失败');
    }
  };

  const handleRedeem = async (rewardId: string, rewardName: string, cost: number) => {
    if (!balance || balance.balance < cost) {
      error('积分不足');
      return;
    }

    const confirmed = await confirm({
      title: '确认兑换',
      message: `确定要用 ${cost} 积分兑换「${rewardName}」吗？`,
      confirmText: '兑换',
      type: 'info',
    });

    if (!confirmed) return;

    try {
      await api.post(`/points/redeem/${rewardId}`);
      success('兑换成功！');
      loadData();
      loadRedemptions();
    } catch (err: any) {
      error(err.response?.data?.message || '兑换失败');
    }
  };

  const getLevelProgress = () => {
    if (!balance) return 0;
    const levels = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000];
    const currentLevelMin = levels[balance.level - 1] || 0;
    const nextLevelMin = levels[balance.level] || balance.totalEarned;
    const progress = ((balance.totalEarned - currentLevelMin) / (nextLevelMin - currentLevelMin)) * 100;
    return Math.min(progress, 100);
  };

  return (
    <div className="points-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">⭐ 积分中心</h1>
          <p className="page-subtitle">完成任务获取积分，兑换家庭奖励</p>
        </div>
        <button className="btn-primary" onClick={() => setShowTransferModal(true)}>
          💸 转账积分
        </button>
      </div>

      {/* 积分概览卡片 */}
      {balance && (
        <div className="balance-card">
          <div className="balance-main">
            <div className="balance-info">
              <div className="balance-label">当前积分</div>
              <div className="balance-value">{balance.balance}</div>
            </div>
            <div className="level-badge">
              <span className="level-icon">🏅</span>
              <span className="level-title">{balance.title}</span>
              <span className="level-number">Lv.{balance.level}</span>
            </div>
          </div>
          <div className="level-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${getLevelProgress()}%` }}></div>
            </div>
            <div className="progress-text">
              累计获得 {balance.totalEarned} 积分 · 已消费 {balance.totalSpent} 积分
            </div>
          </div>
        </div>
      )}

      {/* 标签页 */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          📊 概览
        </button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          📜 明细
        </button>
        <button className={`tab ${activeTab === 'rewards' ? 'active' : ''}`} onClick={() => setActiveTab('rewards')}>
          🎁 奖励
        </button>
        <button className={`tab ${activeTab === 'redeem' ? 'active' : ''}`} onClick={() => { setActiveTab('redeem'); loadRedemptions(); }}>
          🛍️ 兑换记录
        </button>
      </div>

      {/* 概览 */}
      {activeTab === 'overview' && (
        <div className="points-layout">
          <div className="points-main">
            <div className="section-card">
              <h3>🏆 积分排行榜</h3>
              {leaderboard.length === 0 ? (
                <p className="no-data">暂无数据</p>
              ) : (
                <div className="leaderboard">
                  {leaderboard.map((item, index) => (
                    <div key={index} className={`leaderboard-item rank-${index + 1}`}>
                      <span className="rank">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                      </span>
                      <div className="user-info">
                        <span className="username">{(item.userId as User)?.username || '未知'}</span>
                        <span className="user-title">{item.title} Lv.{item.level}</span>
                      </div>
                      <div className="user-points">
                        <span className="balance">{item.balance}</span>
                        <span className="label">积分</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="points-sidebar">
            <div className="section-card">
              <h3>📈 最近获得</h3>
              {history.slice(0, 5).filter(r => r.type === 'earn').map((record) => (
                <div key={record._id} className="recent-item">
                  <span className="source-icon">{sourceLabels[record.source]?.icon || '📌'}</span>
                  <span className="description">{record.description}</span>
                  <span className="amount positive">+{record.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 积分明细 */}
      {activeTab === 'history' && (
        <div className="history-list">
          {history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📜</div>
              <p>暂无积分记录</p>
            </div>
          ) : (
            history.map((record) => (
              <div key={record._id} className={`history-item ${record.type}`}>
                <div className="history-left">
                  <span className="source-icon">{sourceLabels[record.source]?.icon || '📌'}</span>
                  <div className="history-info">
                    <span className="description">{record.description}</span>
                    <span className="source-label">{sourceLabels[record.source]?.label || record.source}</span>
                  </div>
                </div>
                <div className="history-right">
                  <span className={`amount ${record.type === 'earn' ? 'positive' : 'negative'}`}>
                    {record.type === 'earn' ? '+' : ''}{record.amount}
                  </span>
                  <span className="balance-after">余额: {record.balance}</span>
                  <span className="time">{new Date(record.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 奖励商城 */}
      {activeTab === 'rewards' && (
        <div className="rewards-section">
          <div className="rewards-header">
            <h3>🎁 可兑换奖励</h3>
            <button className="btn-secondary" onClick={() => setShowRewardModal(true)}>
              + 创建奖励
            </button>
          </div>
          <div className="rewards-grid">
            {rewards.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎁</div>
                <p>暂无可兑换奖励</p>
                <p className="hint">管理员可以创建奖励供成员兑换</p>
              </div>
            ) : (
              rewards.map((reward) => (
                <div key={reward._id} className={`reward-card ${!reward.isActive ? 'inactive' : ''}`}>
                  <div className="reward-icon">{reward.icon || '🎁'}</div>
                  <div className="reward-info">
                    <h4>{reward.name}</h4>
                    {reward.description && <p>{reward.description}</p>}
                  </div>
                  <div className="reward-footer">
                    <div className="reward-cost">
                      <span className="cost-value">{reward.cost}</span>
                      <span className="cost-label">积分</span>
                    </div>
                    <div className="reward-meta">
                      {reward.stock !== -1 && <span className="stock">库存: {reward.stock}</span>}
                      <span className="redeem-count">{reward.redeemCount} 人兑换</span>
                    </div>
                    <button
                      className="btn-redeem"
                      onClick={() => handleRedeem(reward._id, reward.name, reward.cost)}
                      disabled={!reward.isActive || reward.stock === 0 || (balance?.balance || 0) < reward.cost}
                    >
                      {reward.stock === 0 ? '已售罄' : '立即兑换'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 兑换记录 */}
      {activeTab === 'redeem' && (
        <div className="redemptions-list">
          {redemptions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🛍️</div>
              <p>暂无兑换记录</p>
            </div>
          ) : (
            redemptions.map((item) => (
              <div key={item._id} className={`redemption-item ${item.status}`}>
                <div className="redemption-info">
                  <span className="reward-name">{item.rewardName}</span>
                  <span className="cost">{item.cost} 积分</span>
                </div>
                <div className="redemption-meta">
                  <span className={`status status-${item.status}`}>
                    {item.status === 'pending' ? '待处理' : item.status === 'approved' ? '已批准' : item.status === 'completed' ? '已完成' : '已拒绝'}
                  </span>
                  <span className="time">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 转账模态框 */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>💸 积分转账</h2>
            <div className="form-group">
              <label>转给谁</label>
              <select
                value={transferData.toUserId}
                onChange={(e) => setTransferData({ ...transferData, toUserId: e.target.value })}
              >
                <option value="">选择成员</option>
                {familyMembers.map((m) => (
                  <option key={m._id} value={m._id}>{m.username}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>转账积分</label>
              <input
                type="number"
                min="1"
                max={balance?.balance || 0}
                value={transferData.amount}
                onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                placeholder="输入积分数量"
              />
              <span className="hint">可用积分: {balance?.balance || 0}</span>
            </div>
            <div className="form-group">
              <label>备注（可选）</label>
              <input
                type="text"
                value={transferData.description}
                onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
                placeholder="添加备注"
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowTransferModal(false)}>取消</button>
              <button onClick={handleTransfer}>确认转账</button>
            </div>
          </div>
        </div>
      )}

      {/* 创建奖励模态框 */}
      {showRewardModal && (
        <div className="modal-overlay" onClick={() => setShowRewardModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>🎁 创建奖励</h2>
            <div className="form-group">
              <label>奖励名称 *</label>
              <input
                type="text"
                value={rewardData.name}
                onChange={(e) => setRewardData({ ...rewardData, name: e.target.value })}
                placeholder="例如：看一场电影"
              />
            </div>
            <div className="form-group">
              <label>描述</label>
              <textarea
                value={rewardData.description}
                onChange={(e) => setRewardData({ ...rewardData, description: e.target.value })}
                placeholder="奖励的详细说明"
                rows={2}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>图标</label>
                <input
                  type="text"
                  value={rewardData.icon}
                  onChange={(e) => setRewardData({ ...rewardData, icon: e.target.value })}
                  placeholder="🎁"
                  maxLength={4}
                />
              </div>
              <div className="form-group">
                <label>所需积分 *</label>
                <input
                  type="number"
                  min="1"
                  value={rewardData.cost}
                  onChange={(e) => setRewardData({ ...rewardData, cost: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label>库存 (-1为无限)</label>
                <input
                  type="number"
                  min="-1"
                  value={rewardData.stock}
                  onChange={(e) => setRewardData({ ...rewardData, stock: parseInt(e.target.value) || -1 })}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowRewardModal(false)}>取消</button>
              <button onClick={handleCreateReward}>创建</button>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialogComponent}
    </div>
  );
};

export default Points;
