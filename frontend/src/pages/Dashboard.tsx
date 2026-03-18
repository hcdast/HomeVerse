import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePermissions, Resource, Action } from '../hooks/usePermissions';
import { useNotifications } from '../hooks/useWebSocket';
import { RoleIcons, RoleDescriptions } from '../services/familyService';
import {
  FinanceTrendChart,
  CategoryPieChart,
  WeeklyActivityChart,
  TodoProgressChart,
  StorageChart,
  RecentActivityList,
} from '../components/Charts';
import api from '../services/api';
import './Dashboard.css';

interface DashboardStats {
  overview: {
    totalAlbums: number;
    totalFiles: number;
    totalArticles: number;
    totalMembers: number;
    totalPhotos: number;
    storageUsed: number;
  };
  finance: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    monthlyTrend: Array<{ month: string; income: number; expense: number }>;
    categoryBreakdown: Array<{ category: string; amount: number; percentage: number }>;
  };
  activities: {
    recentActivities: Array<{
      type: string;
      description: string;
      timestamp: Date;
      user: string;
    }>;
    weeklyActivityCount: number[];
  };
  todos: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    completionRate: number;
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { hasPermission, userRole } = usePermissions();
  const { isConnected, requestNotificationPermission } = useNotifications();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/statistics/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    // 请求通知权限
    requestNotificationPermission();
  }, [loadStats, requestNotificationPermission]);

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return '夜深了';
    if (hour < 12) return '早上好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  const formatDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    };
    return now.toLocaleDateString('zh-CN', options);
  };

  const quickActions = [
    { title: '家庭日历', icon: '📅', description: '查看日程', path: '/calendar', color: '#667eea' },
    { title: '待办清单', icon: '✅', description: '管理任务', path: '/todos', color: '#10b981' },
    { title: '财务记账', icon: '💰', description: '记录收支', path: '/finance', color: '#f59e0b' },
    { title: '家庭相册', icon: '📷', description: '珍藏回忆', path: '/albums', color: '#ec4899' },
    { title: '食谱库', icon: '🍳', description: '美食收藏', path: '/recipes', color: '#f97316' },
    { title: 'AI 助手', icon: '🤖', description: 'AI 创作', path: '/ai-tools', color: '#8b5cf6' },
  ];

  return (
    <div className="dashboard-page">
      {/* 欢迎卡片 */}
      <div className="welcome-card">
        <div className="welcome-content">
          <div className="welcome-text">
            <span className="greeting">{getTimeGreeting()}</span>
            <h1 className="welcome-title">欢迎回来, {user?.username}! 👋</h1>
            <p className="welcome-date">{formatDate()}</p>
          </div>
          <div className="welcome-badge">
            <span className="role-icon">{RoleIcons[userRole]}</span>
            <span className="role-text">{RoleDescriptions[userRole]}</span>
            {isConnected && <span className="online-badge" title="实时连接中">●</span>}
          </div>
        </div>
        <div className="welcome-decoration">
          <div className="decoration-circle c1" />
          <div className="decoration-circle c2" />
          <div className="decoration-circle c3" />
        </div>
      </div>

      {/* 统计概览 */}
      <section className="stats-section">
        <h2 className="section-title">
          <span className="title-icon">📊</span>
          数据概览
        </h2>
        <div className="stats-grid">
          <div className="stat-card" style={{ '--stat-color': '#667eea', animationDelay: '0.1s' } as any}>
            <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #667eea22, #764ba222)' }}>
              <span className="stat-icon">📷</span>
            </div>
            <div className="stat-info">
              <div className="stat-number">{stats?.overview.totalAlbums || 0}</div>
              <div className="stat-label">相册</div>
            </div>
            <div className="stat-trend">📷</div>
          </div>

          <div className="stat-card" style={{ '--stat-color': '#10b981', animationDelay: '0.2s' } as any}>
            <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #10b98122, #059c6322)' }}>
              <span className="stat-icon">📁</span>
            </div>
            <div className="stat-info">
              <div className="stat-number" style={{ color: '#10b981' }}>{stats?.overview.totalFiles || 0}</div>
              <div className="stat-label">文件</div>
            </div>
            <div className="stat-trend">📁</div>
          </div>

          <div className="stat-card" style={{ '--stat-color': '#f59e0b', animationDelay: '0.3s' } as any}>
            <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #f59e0b22, #d9740022)' }}>
              <span className="stat-icon">📝</span>
            </div>
            <div className="stat-info">
              <div className="stat-number" style={{ color: '#f59e0b' }}>{stats?.overview.totalArticles || 0}</div>
              <div className="stat-label">文章</div>
            </div>
            <div className="stat-trend">📝</div>
          </div>

          <div className="stat-card" style={{ '--stat-color': '#ec4899', animationDelay: '0.4s' } as any}>
            <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #ec489922, #db277722)' }}>
              <span className="stat-icon">👥</span>
            </div>
            <div className="stat-info">
              <div className="stat-number" style={{ color: '#ec4899' }}>{stats?.overview.totalMembers || 0}</div>
              <div className="stat-label">成员</div>
            </div>
            <div className="stat-trend">👥</div>
          </div>
        </div>
      </section>

      {/* 快捷操作 */}
      <section className="quick-section">
        <h2 className="section-title">
          <span className="title-icon">⚡</span>
          快捷入口
        </h2>
        <div className="quick-actions-grid">
          {quickActions.map((action, index) => (
            <div
              key={action.path}
              className="quick-action-card"
              onClick={() => navigate(action.path)}
              style={{ '--action-color': action.color, animationDelay: `${0.1 * index}s` } as any}
            >
              <div className="action-icon-wrapper">
                <span className="action-icon">{action.icon}</span>
              </div>
              <div className="action-content">
                <h4>{action.title}</h4>
                <p>{action.description}</p>
              </div>
              <span className="action-arrow">→</span>
            </div>
          ))}
        </div>
      </section>

      {/* 图表区域 */}
      <section className="charts-section">
        <h2 className="section-title">
          <span className="title-icon">📈</span>
          数据分析
        </h2>
        
        <div className="charts-grid">
          {/* 财务趋势 */}
          <div className="chart-wrapper chart-large">
            <FinanceTrendChart
              data={stats?.finance.monthlyTrend || []}
              title="📈 收支趋势"
              height={280}
            />
          </div>

          {/* 支出分类 */}
          <div className="chart-wrapper">
            <CategoryPieChart
              data={stats?.finance.categoryBreakdown || []}
              title="📊 支出分类"
              height={280}
            />
          </div>

          {/* 待办进度 */}
          <div className="chart-wrapper">
            <TodoProgressChart
              total={stats?.todos.total || 0}
              completed={stats?.todos.completed || 0}
              pending={stats?.todos.pending || 0}
              overdue={stats?.todos.overdue || 0}
              completionRate={stats?.todos.completionRate || 0}
            />
          </div>

          {/* 周活动统计 */}
          <div className="chart-wrapper">
            <WeeklyActivityChart
              data={stats?.activities.weeklyActivityCount || [0, 0, 0, 0, 0, 0, 0]}
              title="📅 本周活跃度"
              height={200}
            />
          </div>

          {/* 存储空间 */}
          <div className="chart-wrapper">
            <StorageChart used={stats?.overview.storageUsed || 0} />
          </div>

          {/* 最近活动 */}
          <div className="chart-wrapper">
            <RecentActivityList activities={stats?.activities.recentActivities || []} />
          </div>
        </div>
      </section>

      {/* 财务摘要 */}
      <section className="finance-summary">
        <h2 className="section-title">
          <span className="title-icon">💰</span>
          财务概况
        </h2>
        <div className="finance-cards">
          <div className="finance-card income">
            <div className="finance-icon">📈</div>
            <div className="finance-info">
              <span className="finance-label">总收入</span>
              <span className="finance-value">¥{(stats?.finance.totalIncome || 0).toLocaleString()}</span>
            </div>
          </div>
          <div className="finance-card expense">
            <div className="finance-icon">📉</div>
            <div className="finance-info">
              <span className="finance-label">总支出</span>
              <span className="finance-value">¥{(stats?.finance.totalExpense || 0).toLocaleString()}</span>
            </div>
          </div>
          <div className="finance-card balance">
            <div className="finance-icon">💎</div>
            <div className="finance-info">
              <span className="finance-label">结余</span>
              <span className="finance-value">¥{(stats?.finance.balance || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
