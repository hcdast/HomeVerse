import { useState, useEffect } from 'react';
import api from '@/services/api';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './Digest.css';

interface MemberContribution {
  userId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  username: string;
  todosCompleted: number;
  choresCompleted: number;
  photosUploaded: number;
  pointsEarned: number;
}

interface Highlight {
  type: string;
  title: string;
  description: string;
  icon: string;
}

interface ActivitySummary {
  todosCompleted: number;
  todosCreated: number;
  choresCompleted: number;
  photosUploaded: number;
  articlesCreated: number;
  eventsCreated: number;
  messagesCount: number;
  transactionsCount: number;
  totalIncome: number;
  totalExpense: number;
  pointsEarned: number;
}

interface Digest {
  _id: string;
  type: 'daily' | 'weekly' | 'monthly';
  status: string;
  title: string;
  startDate: string;
  endDate: string;
  activitySummary: ActivitySummary;
  memberContributions: MemberContribution[];
  highlights: Highlight[];
  aiSummary: string;
  aiSuggestions: string;
  upcomingEvents: string[];
  readBy: string[];
  createdAt: string;
}

interface Subscription {
  dailyEnabled: boolean;
  weeklyEnabled: boolean;
  monthlyEnabled: boolean;
  preferredTime: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
}

const typeLabels = {
  daily: { label: '日报', icon: '📅', color: '#1890ff' },
  weekly: { label: '周报', icon: '📆', color: '#52c41a' },
  monthly: { label: '月报', icon: '🗓️', color: '#722ed1' },
};

const Digest = () => {
  const [digests, setDigests] = useState<Digest[]>([]);
  const [latestDigest, setLatestDigest] = useState<Digest | null>(null);
  const [selectedDigest, setSelectedDigest] = useState<Digest | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [activeTab, setActiveTab] = useState<'latest' | 'history' | 'settings'>('latest');
  const [generating, setGenerating] = useState<string | null>(null);
  const { toast, hideToast, success, error } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [digestsRes, latestRes, subRes] = await Promise.all([
        api.get('/digest'),
        api.get('/digest/latest'),
        api.get('/digest/subscription/settings'),
      ]);

      setDigests(digestsRes.data.digests || []);
      setLatestDigest(latestRes.data);
      setSubscription(subRes.data);

      if (latestRes.data) {
        setSelectedDigest(latestRes.data);
      }
    } catch (err) {
      console.error('加载数据失败:', err);
    }
  };

  const generateDigest = async (type: 'daily' | 'weekly' | 'monthly') => {
    setGenerating(type);
    try {
      const res = await api.post(`/digest/generate/${type}`);
      success(`${typeLabels[type].label}生成成功！`);
      setSelectedDigest(res.data);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '生成失败');
    } finally {
      setGenerating(null);
    }
  };

  const updateSubscription = async (updates: Partial<Subscription>) => {
    try {
      const res = await api.put('/digest/subscription/settings', updates);
      setSubscription(res.data);
      success('设置已保存');
    } catch (err: any) {
      error(err.response?.data?.message || '保存失败');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="digest-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">📊 家庭动态报告</h1>
          <p className="page-subtitle">AI智能生成家庭活动摘要</p>
        </div>
        <div className="generate-buttons">
          <button
            className="btn-generate daily"
            onClick={() => generateDigest('daily')}
            disabled={!!generating}
          >
            {generating === 'daily' ? '生成中...' : '📅 生成日报'}
          </button>
          <button
            className="btn-generate weekly"
            onClick={() => generateDigest('weekly')}
            disabled={!!generating}
          >
            {generating === 'weekly' ? '生成中...' : '📆 生成周报'}
          </button>
          <button
            className="btn-generate monthly"
            onClick={() => generateDigest('monthly')}
            disabled={!!generating}
          >
            {generating === 'monthly' ? '生成中...' : '🗓️ 生成月报'}
          </button>
        </div>
      </div>

      {/* 标签页 */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'latest' ? 'active' : ''}`} onClick={() => setActiveTab('latest')}>
          📄 {selectedDigest ? '报告详情' : '最新报告'}
        </button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          📚 历史记录
        </button>
        <button className={`tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          ⚙️ 订阅设置
        </button>
      </div>

      {/* 最新报告 */}
      {activeTab === 'latest' && selectedDigest && (
        <div className="digest-content">
          <div className="digest-header-card">
            <div className="digest-title-section">
              <span className={`type-badge type-${selectedDigest.type}`}>
                {typeLabels[selectedDigest.type].icon} {typeLabels[selectedDigest.type].label}
              </span>
              <h2>{selectedDigest.title}</h2>
              <p className="date-range">
                {formatDate(selectedDigest.startDate)} - {formatDate(selectedDigest.endDate)}
              </p>
            </div>
          </div>

          {/* AI总结 */}
          <div className="section-card ai-summary">
            <div className="section-header">
              <h3>🤖 AI智能总结</h3>
            </div>
            <div className="ai-content">
              <p>{selectedDigest.aiSummary}</p>
            </div>
            {selectedDigest.aiSuggestions && (
              <div className="ai-suggestions">
                <h4>💡 建议</h4>
                <p>{selectedDigest.aiSuggestions}</p>
              </div>
            )}
          </div>

          {/* 活动统计 */}
          <div className="section-card">
            <h3>📈 活动统计</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-icon">✅</div>
                <div className="stat-value">{selectedDigest.activitySummary.todosCompleted}</div>
                <div className="stat-label">待办完成</div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">🧹</div>
                <div className="stat-value">{selectedDigest.activitySummary.choresCompleted}</div>
                <div className="stat-label">家务完成</div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">📷</div>
                <div className="stat-value">{selectedDigest.activitySummary.photosUploaded}</div>
                <div className="stat-label">照片上传</div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">📝</div>
                <div className="stat-value">{selectedDigest.activitySummary.articlesCreated}</div>
                <div className="stat-label">文章发布</div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">💬</div>
                <div className="stat-value">{selectedDigest.activitySummary.messagesCount}</div>
                <div className="stat-label">消息数</div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">⭐</div>
                <div className="stat-value">{selectedDigest.activitySummary.pointsEarned}</div>
                <div className="stat-label">积分获得</div>
              </div>
            </div>
          </div>

          {/* 财务概览 */}
          <div className="section-card finance-overview">
            <h3>💰 财务概览</h3>
            <div className="finance-stats">
              <div className="finance-item income">
                <span className="label">收入</span>
                <span className="value">¥{selectedDigest.activitySummary.totalIncome.toLocaleString()}</span>
              </div>
              <div className="finance-item expense">
                <span className="label">支出</span>
                <span className="value">¥{selectedDigest.activitySummary.totalExpense.toLocaleString()}</span>
              </div>
              <div className="finance-item balance">
                <span className="label">结余</span>
                <span className="value">
                  ¥{(selectedDigest.activitySummary.totalIncome - selectedDigest.activitySummary.totalExpense).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* 成员贡献 */}
          {selectedDigest.memberContributions.length > 0 && (
            <div className="section-card">
              <h3>🏆 成员贡献排行</h3>
              <div className="contributions-list">
                {selectedDigest.memberContributions.map((member, index) => (
                  <div key={index} className={`contribution-item rank-${index + 1}`}>
                    <span className="rank">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </span>
                    <div className="member-info">
                      <span className="username">{member.userId?.username || member.username}</span>
                      <span className="stats">
                        待办{member.todosCompleted} · 家务{member.choresCompleted} · 照片{member.photosUploaded}
                      </span>
                    </div>
                    <div className="points">
                      <span className="points-value">{member.pointsEarned}</span>
                      <span className="points-label">积分</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 亮点事件 */}
          {selectedDigest.highlights.length > 0 && (
            <div className="section-card">
              <h3>✨ 亮点时刻</h3>
              <div className="highlights-list">
                {selectedDigest.highlights.map((highlight, index) => (
                  <div key={index} className="highlight-item">
                    <span className="highlight-icon">{highlight.icon}</span>
                    <div className="highlight-content">
                      <h4>{highlight.title}</h4>
                      <p>{highlight.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 即将到来的事件 */}
          {selectedDigest.upcomingEvents.length > 0 && (
            <div className="section-card">
              <h3>📅 即将到来</h3>
              <ul className="upcoming-list">
                {selectedDigest.upcomingEvents.map((event, index) => (
                  <li key={index}>{event}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === 'latest' && !selectedDigest && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <p>暂无报告</p>
          <p className="hint">点击上方按钮生成第一份家庭动态报告</p>
        </div>
      )}

      {/* 历史记录 */}
      {activeTab === 'history' && (
        <div className="history-section">
          {digests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <p>暂无历史记录</p>
            </div>
          ) : (
            <div className="history-list">
              {digests.map((digest) => (
                <div
                  key={digest._id}
                  className={`history-item ${selectedDigest?._id === digest._id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedDigest(digest);
                    setActiveTab('latest'); // 切换到最新报告标签页显示详情
                  }}
                >
                  <span className={`type-badge type-${digest.type}`}>
                    {typeLabels[digest.type].icon}
                  </span>
                  <div className="history-info">
                    <h4>{digest.title}</h4>
                    <p>{formatDate(digest.startDate)} - {formatDate(digest.endDate)}</p>
                  </div>
                  <div className="history-stats">
                    <span>✅{digest.activitySummary.todosCompleted}</span>
                    <span>📷{digest.activitySummary.photosUploaded}</span>
                    <span>⭐{digest.activitySummary.pointsEarned}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 订阅设置 */}
      {activeTab === 'settings' && subscription && (
        <div className="settings-section">
          <div className="section-card">
            <h3>📬 订阅偏好</h3>
            <div className="settings-list">
              <div className="setting-item">
                <div className="setting-info">
                  <h4>📅 每日摘要</h4>
                  <p>每天早上收到前一天的家庭活动摘要</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={subscription.dailyEnabled}
                    onChange={(e) => updateSubscription({ dailyEnabled: e.target.checked })}
                  />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <h4>📆 每周摘要</h4>
                  <p>每周一收到上周的家庭活动摘要</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={subscription.weeklyEnabled}
                    onChange={(e) => updateSubscription({ weeklyEnabled: e.target.checked })}
                  />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <h4>🗓️ 每月摘要</h4>
                  <p>每月初收到上月的家庭活动摘要</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={subscription.monthlyEnabled}
                    onChange={(e) => updateSubscription({ monthlyEnabled: e.target.checked })}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>

          <div className="section-card">
            <h3>🔔 通知方式</h3>
            <div className="settings-list">
              <div className="setting-item">
                <div className="setting-info">
                  <h4>📧 邮件通知</h4>
                  <p>通过邮件接收摘要</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={subscription.emailEnabled}
                    onChange={(e) => updateSubscription({ emailEnabled: e.target.checked })}
                  />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <h4>🔔 推送通知</h4>
                  <p>通过应用推送接收摘要</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={subscription.pushEnabled}
                    onChange={(e) => updateSubscription({ pushEnabled: e.target.checked })}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>

          <div className="section-card">
            <h3>⏰ 发送时间</h3>
            <div className="time-setting">
              <label>首选发送时间</label>
              <input
                type="time"
                value={subscription.preferredTime}
                onChange={(e) => updateSubscription({ preferredTime: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Digest;
