import { useState, useEffect } from 'react';
import api from '../services/api';
import './Subscriptions.css';

interface Subscription {
  _id: string;
  name: string;
  description?: string;
  type: string;
  status: 'active' | 'paused' | 'cancelled';
  cost: number;
  currency: string;
  billingCycle: string;
  startDate: string;
  nextBillingDate: string;
  provider?: string;
  icon?: string;
  color?: string;
  managedBy?: { _id: string; username: string };
  reminderEnabled: boolean;
  tags: string[];
}

interface Statistics {
  totalActive: number;
  monthlyTotal: number;
  yearlyTotal: number;
  byType: { type: string; count: number; cost: number }[];
  upcomingThisWeek: number;
}

const typeLabels: Record<string, string> = {
  streaming: '流媒体',
  software: '软件',
  insurance: '保险',
  membership: '会员',
  utility: '公用事业',
  education: '教育',
  health: '健康',
  other: '其他',
};

const cycleLabels: Record<string, string> = {
  monthly: '月付',
  quarterly: '季付',
  semi_annually: '半年付',
  annually: '年付',
  custom: '自定义',
};

const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const [newSub, setNewSub] = useState({
    name: '',
    description: '',
    type: 'streaming',
    cost: '',
    billingCycle: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    provider: '',
    reminderEnabled: true,
    reminderDaysBefore: 3,
  });

  useEffect(() => {
    loadSubscriptions();
    loadStatistics();
  }, [filter]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await api.get(`/subscriptions${params}`);
      setSubscriptions(res.data);
    } catch (err) {
      console.error('加载订阅失败', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const res = await api.get('/subscriptions/statistics');
      setStatistics(res.data);
    } catch (err) {
      console.error('加载统计失败', err);
    }
  };

  const handleCreate = async () => {
    if (!newSub.name || !newSub.cost) {
      alert('请填写名称和费用');
      return;
    }

    try {
      await api.post('/subscriptions', {
        ...newSub,
        cost: parseFloat(newSub.cost),
      });
      setShowCreateModal(false);
      setNewSub({
        name: '',
        description: '',
        type: 'streaming',
        cost: '',
        billingCycle: 'monthly',
        startDate: new Date().toISOString().split('T')[0],
        provider: '',
        reminderEnabled: true,
        reminderDaysBefore: 3,
      });
      loadSubscriptions();
      loadStatistics();
    } catch (err) {
      console.error('创建订阅失败', err);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await api.put(`/subscriptions/${id}/pause`);
      loadSubscriptions();
      loadStatistics();
    } catch (err) {
      console.error('暂停订阅失败', err);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await api.put(`/subscriptions/${id}/resume`);
      loadSubscriptions();
      loadStatistics();
    } catch (err) {
      console.error('恢复订阅失败', err);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('确定要取消这个订阅吗？')) return;

    try {
      await api.put(`/subscriptions/${id}/cancel`);
      loadSubscriptions();
      loadStatistics();
    } catch (err) {
      console.error('取消订阅失败', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个订阅吗？')) return;

    try {
      await api.delete(`/subscriptions/${id}`);
      loadSubscriptions();
      loadStatistics();
    } catch (err) {
      console.error('删除订阅失败', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const getDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr);
    const today = new Date();
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      streaming: '🎬',
      software: '💻',
      insurance: '🛡️',
      membership: '👤',
      utility: '💡',
      education: '📚',
      health: '❤️',
      other: '📦',
    };
    return icons[type] || '📦';
  };

  return (
    <div className="subscriptions-page">
      <div className="page-header">
        <div className="header-content">
          <h1>💳 订阅管理</h1>
          <p>追踪所有订阅服务，掌控家庭支出</p>
        </div>
        <button className="btn-create" onClick={() => setShowCreateModal(true)}>
          ➕ 添加订阅
        </button>
      </div>

      {statistics && (
        <div className="stats-cards">
          <div className="stat-card highlight">
            <span className="stat-icon">💰</span>
            <div className="stat-info">
              <span className="stat-value">{formatCurrency(statistics.monthlyTotal)}</span>
              <span className="stat-label">月均支出</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📅</span>
            <div className="stat-info">
              <span className="stat-value">{formatCurrency(statistics.yearlyTotal)}</span>
              <span className="stat-label">年度预估</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">✅</span>
            <div className="stat-info">
              <span className="stat-value">{statistics.totalActive}</span>
              <span className="stat-label">活跃订阅</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">⏰</span>
            <div className="stat-info">
              <span className="stat-value">{statistics.upcomingThisWeek}</span>
              <span className="stat-label">本周续费</span>
            </div>
          </div>
        </div>
      )}

      {statistics && statistics.byType.length > 0 && (
        <div className="type-breakdown">
          <h3>支出分类</h3>
          <div className="type-bars">
            {statistics.byType.map((item) => (
              <div key={item.type} className="type-bar-item">
                <div className="type-bar-header">
                  <span>
                    {getTypeIcon(item.type)} {typeLabels[item.type]}
                  </span>
                  <span>{formatCurrency(item.cost)}/月</span>
                </div>
                <div className="type-bar">
                  <div
                    className="type-bar-fill"
                    style={{
                      width: `${(item.cost / statistics.monthlyTotal) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          全部
        </button>
        <button
          className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          活跃
        </button>
        <button
          className={`filter-tab ${filter === 'paused' ? 'active' : ''}`}
          onClick={() => setFilter('paused')}
        >
          已暂停
        </button>
        <button
          className={`filter-tab ${filter === 'cancelled' ? 'active' : ''}`}
          onClick={() => setFilter('cancelled')}
        >
          已取消
        </button>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <div className="subscriptions-list">
          {subscriptions.length === 0 ? (
            <div className="empty">暂无订阅</div>
          ) : (
            subscriptions.map((sub) => {
              const daysUntil = getDaysUntil(sub.nextBillingDate);

              return (
                <div key={sub._id} className={`subscription-card ${sub.status}`}>
                  <div className="sub-icon">{sub.icon || getTypeIcon(sub.type)}</div>
                  <div className="sub-info">
                    <div className="sub-header">
                      <h3>{sub.name}</h3>
                      <span className={`status-badge ${sub.status}`}>
                        {sub.status === 'active' ? '活跃' : sub.status === 'paused' ? '已暂停' : '已取消'}
                      </span>
                    </div>
                    <p className="sub-provider">{sub.provider || typeLabels[sub.type]}</p>
                    <div className="sub-meta">
                      <span className="sub-cost">
                        {formatCurrency(sub.cost)} / {cycleLabels[sub.billingCycle]}
                      </span>
                      {sub.status === 'active' && (
                        <span className={`sub-next ${daysUntil <= 3 ? 'soon' : ''}`}>
                          {daysUntil <= 0 ? '今天续费' : `${daysUntil} 天后续费`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="sub-actions">
                    {sub.status === 'active' && (
                      <button className="action-btn pause" onClick={() => handlePause(sub._id)}>
                        暂停
                      </button>
                    )}
                    {sub.status === 'paused' && (
                      <button className="action-btn resume" onClick={() => handleResume(sub._id)}>
                        恢复
                      </button>
                    )}
                    {sub.status === 'active' && (
                      <button className="action-btn cancel" onClick={() => handleCancel(sub._id)}>
                        取消
                      </button>
                    )}
                    <button className="action-btn delete" onClick={() => handleDelete(sub._id)}>
                      删除
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>添加订阅</h2>

            <div className="form-group">
              <label>订阅名称</label>
              <input
                type="text"
                value={newSub.name}
                onChange={(e) => setNewSub((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="例如：Netflix"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>类型</label>
                <select
                  value={newSub.type}
                  onChange={(e) => setNewSub((prev) => ({ ...prev, type: e.target.value }))}
                >
                  {Object.entries(typeLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>计费周期</label>
                <select
                  value={newSub.billingCycle}
                  onChange={(e) => setNewSub((prev) => ({ ...prev, billingCycle: e.target.value }))}
                >
                  {Object.entries(cycleLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>费用 (¥)</label>
                <input
                  type="number"
                  value={newSub.cost}
                  onChange={(e) => setNewSub((prev) => ({ ...prev, cost: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label>开始日期</label>
                <input
                  type="date"
                  value={newSub.startDate}
                  onChange={(e) => setNewSub((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label>提供商（可选）</label>
              <input
                type="text"
                value={newSub.provider}
                onChange={(e) => setNewSub((prev) => ({ ...prev, provider: e.target.value }))}
                placeholder="例如：腾讯视频"
              />
            </div>

            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={newSub.reminderEnabled}
                  onChange={(e) =>
                    setNewSub((prev) => ({ ...prev, reminderEnabled: e.target.checked }))
                  }
                />
                开启续费提醒
              </label>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button className="btn-confirm" onClick={handleCreate}>
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
