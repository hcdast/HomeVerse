import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import './Charts.css';

// 颜色主题
const COLORS = {
  primary: '#667eea',
  secondary: '#764ba2',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

const PIE_COLORS = ['#667eea', '#764ba2', '#f97316', '#10b981', '#3b82f6', '#f59e0b'];

interface ChartProps {
  data: any[];
  title?: string;
  height?: number;
}

// 收支趋势图
interface FinanceTrendData {
  month: string;
  income: number;
  expense: number;
}

export const FinanceTrendChart = ({ data, title, height = 300 }: ChartProps & { data: FinanceTrendData[] }) => {
  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey="month" 
            stroke="rgba(255,255,255,0.6)" 
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.6)" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `¥${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'rgba(15, 15, 35, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}
            labelStyle={{ color: 'rgba(255,255,255,0.9)' }}
            formatter={(value: number) => [`¥${value.toLocaleString()}`, '']}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.8)' }}>{value}</span>}
          />
          <Area
            type="monotone"
            dataKey="income"
            name="收入"
            stroke={COLORS.success}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#incomeGradient)"
          />
          <Area
            type="monotone"
            dataKey="expense"
            name="支出"
            stroke={COLORS.danger}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#expenseGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// 分类饼图
interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
}

export const CategoryPieChart = ({ data, title, height = 300 }: ChartProps & { data: CategoryData[] }) => {
  const renderCustomLabel = ({ name, percent }: { name: string; percent: number }) => {
    return `${name} ${(percent * 100).toFixed(0)}%`;
  };

  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="amount"
            nameKey="category"
            label={renderCustomLabel}
            labelLine={{ stroke: 'rgba(255,255,255,0.3)' }}
          >
            {data.map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={PIE_COLORS[index % PIE_COLORS.length]}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15, 15, 35, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
            }}
            formatter={(value: number) => [`¥${value.toLocaleString()}`, '']}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// 活动柱状图
interface ActivityData {
  day: string;
  count: number;
}

export const WeeklyActivityChart = ({ data, title, height = 200 }: ChartProps & { data: number[] }) => {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const chartData = days.map((day, index) => ({
    day,
    count: data[index] || 0,
  }));

  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
          <XAxis 
            dataKey="day" 
            stroke="rgba(255,255,255,0.6)" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.6)" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15, 15, 35, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
            }}
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            formatter={(value: number) => [value, '活动数']}
          />
          <Bar 
            dataKey="count" 
            fill={COLORS.primary}
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 待办完成率进度条
interface TodoStatsProps {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
}

export const TodoProgressChart = ({ total, completed, pending, overdue, completionRate }: TodoStatsProps) => {
  return (
    <div className="chart-container todo-progress">
      <div className="progress-header">
        <span className="progress-title">任务完成率</span>
        <span className="progress-value">{completionRate}%</span>
      </div>
      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${completionRate}%` }}
        />
      </div>
      <div className="todo-stats-grid">
        <div className="todo-stat-item">
          <span className="stat-dot" style={{ background: COLORS.primary }} />
          <span className="stat-label">总计</span>
          <span className="stat-value">{total}</span>
        </div>
        <div className="todo-stat-item">
          <span className="stat-dot" style={{ background: COLORS.success }} />
          <span className="stat-label">已完成</span>
          <span className="stat-value">{completed}</span>
        </div>
        <div className="todo-stat-item">
          <span className="stat-dot" style={{ background: COLORS.warning }} />
          <span className="stat-label">待处理</span>
          <span className="stat-value">{pending}</span>
        </div>
        <div className="todo-stat-item">
          <span className="stat-dot" style={{ background: COLORS.danger }} />
          <span className="stat-label">已逾期</span>
          <span className="stat-value">{overdue}</span>
        </div>
      </div>
    </div>
  );
};

// 存储使用量
interface StorageChartProps {
  used: number;
  total?: number;
}

export const StorageChart = ({ used, total = 10 * 1024 * 1024 * 1024 }: StorageChartProps) => {
  const percentage = Math.min((used / total) * 100, 100);
  
  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  return (
    <div className="chart-container storage-chart">
      <div className="storage-header">
        <span className="storage-title">💾 存储空间</span>
        <span className="storage-value">{formatSize(used)} / {formatSize(total)}</span>
      </div>
      <div className="storage-bar-container">
        <div 
          className="storage-bar-fill" 
          style={{ 
            width: `${percentage}%`,
            background: percentage > 80 ? COLORS.danger : percentage > 50 ? COLORS.warning : COLORS.success,
          }}
        />
      </div>
      <div className="storage-percentage">{percentage.toFixed(1)}% 已使用</div>
    </div>
  );
};

// 最近活动列表
interface ActivityItem {
  type: string;
  description: string;
  timestamp: Date;
  user: string;
}

export const RecentActivityList = ({ activities }: { activities: ActivityItem[] }) => {
  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      create: '➕',
      update: '✏️',
      delete: '🗑️',
      upload: '📤',
      download: '📥',
      login: '🔑',
      comment: '💬',
      like: '❤️',
    };
    return icons[type] || '📌';
  };

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
    return new Date(date).toLocaleDateString('zh-CN');
  };

  return (
    <div className="chart-container activity-list">
      <h3 className="chart-title">📋 最近活动</h3>
      <div className="activity-items">
        {activities.length === 0 ? (
          <div className="no-activity">暂无活动记录</div>
        ) : (
          activities.slice(0, 8).map((activity, index) => (
            <div key={index} className="activity-item">
              <span className="activity-icon">{getActivityIcon(activity.type)}</span>
              <div className="activity-content">
                <span className="activity-desc">{activity.description || activity.type}</span>
                <span className="activity-meta">
                  {activity.user && <span className="activity-user">{activity.user}</span>}
                  <span className="activity-time">{formatTime(activity.timestamp)}</span>
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};



