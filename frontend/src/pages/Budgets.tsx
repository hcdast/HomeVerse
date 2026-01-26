import { useState, useEffect } from 'react';
import api from '@/services/api';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './Budgets.css';

interface CategoryBudget {
  category: string;
  budgetAmount: number;
  spent: number;
  alertThreshold: number;
  icon?: string;
  color?: string;
}

interface SavingsGoal {
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  icon?: string;
}

interface Budget {
  _id: string;
  year: number;
  month: number;
  categories: CategoryBudget[];
  totalBudget: number;
  totalSpent: number;
  totalIncome: number;
  savingsGoals: SavingsGoal[];
  isLocked: boolean;
}

interface YearlyStats {
  months: { month: number; budget: number; spent: number; income: number }[];
  totalBudget: number;
  totalSpent: number;
  totalIncome: number;
  savingsRate: number;
}

const Budgets = () => {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [yearlyStats, setYearlyStats] = useState<YearlyStats | null>(null);
  const [alerts, setAlerts] = useState<{ category: string; percentage: number }[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryBudget | null>(null);
  const { toast, hideToast, success, error } = useToast();

  const [goalForm, setGoalForm] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
  });

  useEffect(() => {
    loadData();
  }, [currentYear, currentMonth]);

  const loadData = async () => {
    try {
      const [budgetRes, yearlyRes, alertsRes] = await Promise.all([
        api.get(`/budgets/month/${currentYear}/${currentMonth}`),
        api.get(`/budgets/year/${currentYear}`),
        api.get(`/budgets/month/${currentYear}/${currentMonth}/alerts`),
      ]);
      setBudget(budgetRes.data);
      setYearlyStats(yearlyRes.data);
      setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
    } catch (err) {
      console.error('加载数据失败:', err);
    }
  };

  const handleUpdateTotal = async () => {
    const newTotal = prompt('请输入月度总预算:', budget?.totalBudget?.toString() || '0');
    if (newTotal === null) return;

    try {
      await api.put(`/budgets/month/${currentYear}/${currentMonth}/total`, {
        totalBudget: parseFloat(newTotal),
      });
      success('更新成功');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '更新失败');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    try {
      await api.put(`/budgets/month/${currentYear}/${currentMonth}/category`, editingCategory);
      setShowEditModal(false);
      setEditingCategory(null);
      success('更新成功');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '更新失败');
    }
  };

  const handleAddGoal = async () => {
    if (!goalForm.name || !goalForm.targetAmount) {
      error('请填写目标名称和金额');
      return;
    }

    try {
      await api.post(`/budgets/month/${currentYear}/${currentMonth}/savings`, {
        name: goalForm.name,
        targetAmount: parseFloat(goalForm.targetAmount),
        currentAmount: parseFloat(goalForm.currentAmount) || 0,
        deadline: goalForm.deadline || undefined,
      });
      setShowGoalModal(false);
      setGoalForm({ name: '', targetAmount: '', currentAmount: '', deadline: '' });
      success('添加成功');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '添加失败');
    }
  };

  const handleUpdateGoalProgress = async (index: number) => {
    const goal = budget?.savingsGoals[index];
    if (!goal) return;

    const newAmount = prompt('请输入当前存款金额:', goal.currentAmount.toString());
    if (newAmount === null) return;

    try {
      await api.put(`/budgets/month/${currentYear}/${currentMonth}/savings/${index}`, {
        currentAmount: parseFloat(newAmount),
      });
      success('更新成功');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '更新失败');
    }
  };

  const handleDeleteGoal = async (index: number) => {
    if (!confirm('确定要删除此储蓄目标吗？')) return;

    try {
      await api.delete(`/budgets/month/${currentYear}/${currentMonth}/savings/${index}`);
      success('已删除');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '删除失败');
    }
  };

  const handleSyncFromFinance = async () => {
    try {
      // 从财务模块获取当月数据
      const financeRes = await api.get('/finance/statistics', {
        params: { year: currentYear, month: currentMonth },
      });
      
      const stats = financeRes.data;
      
      await api.put(`/budgets/month/${currentYear}/${currentMonth}/sync`, {
        spentByCategory: stats.byCategory || [],
        totalSpent: stats.totalExpense || 0,
        totalIncome: stats.totalIncome || 0,
      });
      
      success('同步成功');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '同步失败');
    }
  };

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  const getPercentage = (spent: number, budget: number) => {
    if (budget <= 0) return 0;
    return Math.min(100, Math.round((spent / budget) * 100));
  };

  const getProgressColor = (percentage: number, threshold: number) => {
    if (percentage >= 100) return '#e74c3c';
    if (percentage >= threshold) return '#f39c12';
    return '#27ae60';
  };

  return (
    <div className="budgets-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">💰 预算规划</h1>
          <p className="page-subtitle">合理规划收支，实现财务目标</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleSyncFromFinance}>
            🔄 同步财务数据
          </button>
        </div>
      </div>

      {/* 月份选择器 */}
      <div className="month-selector">
        <button onClick={() => {
          if (currentMonth === 1) {
            setCurrentYear(currentYear - 1);
            setCurrentMonth(12);
          } else {
            setCurrentMonth(currentMonth - 1);
          }
        }}>←</button>
        <span className="current-month">{currentYear}年 {monthNames[currentMonth - 1]}</span>
        <button onClick={() => {
          if (currentMonth === 12) {
            setCurrentYear(currentYear + 1);
            setCurrentMonth(1);
          } else {
            setCurrentMonth(currentMonth + 1);
          }
        }}>→</button>
      </div>

      {/* 预算警告 */}
      {alerts.length > 0 && (
        <div className="alerts-section">
          {alerts.map((alert, i) => (
            <div key={i} className="alert-item">
              ⚠️ <strong>{alert.category}</strong> 已使用 {alert.percentage}% 的预算
            </div>
          ))}
        </div>
      )}

      <div className="budgets-layout">
        {/* 左侧主内容 */}
        <div className="budgets-main">
          {/* 总览卡片 */}
          <div className="overview-cards">
            <div className="overview-card" onClick={handleUpdateTotal}>
              <div className="card-icon">💵</div>
              <div className="card-content">
                <div className="card-value">¥{budget?.totalBudget?.toLocaleString() || 0}</div>
                <div className="card-label">月度预算</div>
              </div>
            </div>
            <div className="overview-card spent">
              <div className="card-icon">💳</div>
              <div className="card-content">
                <div className="card-value">¥{budget?.totalSpent?.toLocaleString() || 0}</div>
                <div className="card-label">已支出</div>
              </div>
            </div>
            <div className="overview-card income">
              <div className="card-icon">📈</div>
              <div className="card-content">
                <div className="card-value">¥{budget?.totalIncome?.toLocaleString() || 0}</div>
                <div className="card-label">收入</div>
              </div>
            </div>
            <div className="overview-card balance">
              <div className="card-icon">💰</div>
              <div className="card-content">
                <div className="card-value">
                  ¥{((budget?.totalBudget || 0) - (budget?.totalSpent || 0)).toLocaleString()}
                </div>
                <div className="card-label">剩余预算</div>
              </div>
            </div>
          </div>

          {/* 分类预算 */}
          <div className="section-card">
            <h3>📊 分类预算</h3>
            <div className="categories-list">
              {budget?.categories?.map((cat, i) => {
                const percentage = getPercentage(cat.spent, cat.budgetAmount);
                const color = getProgressColor(percentage, cat.alertThreshold);
                return (
                  <div key={i} className="category-item" onClick={() => {
                    setEditingCategory({ ...cat });
                    setShowEditModal(true);
                  }}>
                    <div className="category-header">
                      <span className="category-icon">{cat.icon || '📦'}</span>
                      <span className="category-name">{cat.category}</span>
                      <span className="category-amount">
                        ¥{cat.spent.toLocaleString()} / ¥{cat.budgetAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    <div className="category-percentage" style={{ color }}>
                      {percentage}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 储蓄目标 */}
          <div className="section-card">
            <div className="section-header">
              <h3>🎯 储蓄目标</h3>
              <button className="btn-add" onClick={() => setShowGoalModal(true)}>
                + 添加目标
              </button>
            </div>
            {budget?.savingsGoals?.length === 0 ? (
              <div className="empty-goals">
                <p>还没有储蓄目标，点击上方按钮添加</p>
              </div>
            ) : (
              <div className="goals-list">
                {budget?.savingsGoals?.map((goal, i) => {
                  const percentage = getPercentage(goal.currentAmount, goal.targetAmount);
                  return (
                    <div key={i} className="goal-item">
                      <div className="goal-header">
                        <span className="goal-icon">{goal.icon || '💎'}</span>
                        <span className="goal-name">{goal.name}</span>
                        {goal.deadline && (
                          <span className="goal-deadline">
                            📅 {new Date(goal.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="goal-progress">
                        <div className="progress-bar">
                          <div
                            className="progress-fill savings"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="goal-amount">
                          ¥{goal.currentAmount.toLocaleString()} / ¥{goal.targetAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="goal-actions">
                        <button onClick={() => handleUpdateGoalProgress(i)}>更新进度</button>
                        <button className="delete" onClick={() => handleDeleteGoal(i)}>删除</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 右侧年度统计 */}
        <div className="budgets-sidebar">
          <div className="sidebar-card">
            <h3>📅 {currentYear}年统计</h3>
            <div className="yearly-summary">
              <div className="summary-item">
                <span className="label">总预算</span>
                <span className="value">¥{yearlyStats?.totalBudget?.toLocaleString() || 0}</span>
              </div>
              <div className="summary-item">
                <span className="label">总支出</span>
                <span className="value expense">¥{yearlyStats?.totalSpent?.toLocaleString() || 0}</span>
              </div>
              <div className="summary-item">
                <span className="label">总收入</span>
                <span className="value income">¥{yearlyStats?.totalIncome?.toLocaleString() || 0}</span>
              </div>
              <div className="summary-item highlight">
                <span className="label">储蓄率</span>
                <span className="value">{yearlyStats?.savingsRate || 0}%</span>
              </div>
            </div>

            <h4>月度趋势</h4>
            <div className="monthly-bars">
              {yearlyStats?.months?.map((m) => (
                <div key={m.month} className="month-bar-item">
                  <div className="month-label">{m.month}月</div>
                  <div className="bar-container">
                    <div
                      className="bar-fill"
                      style={{
                        height: `${m.budget > 0 ? Math.min(100, (m.spent / m.budget) * 100) : 0}%`,
                        backgroundColor: m.spent > m.budget ? '#e74c3c' : '#27ae60',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 编辑分类预算模态框 */}
      {showEditModal && editingCategory && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <h2>编辑预算 - {editingCategory.category}</h2>
            <div className="form-group">
              <label>预算金额</label>
              <input
                type="number"
                value={editingCategory.budgetAmount}
                onChange={(e) => setEditingCategory({
                  ...editingCategory,
                  budgetAmount: parseFloat(e.target.value) || 0,
                })}
              />
            </div>
            <div className="form-group">
              <label>警告阈值 (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={editingCategory.alertThreshold}
                onChange={(e) => setEditingCategory({
                  ...editingCategory,
                  alertThreshold: parseInt(e.target.value) || 80,
                })}
              />
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowEditModal(false)}>取消</button>
              <button type="submit" onClick={handleUpdateCategory}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 添加储蓄目标模态框 */}
      {showGoalModal && (
        <div className="modal-overlay" onClick={() => setShowGoalModal(false)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <h2>添加储蓄目标</h2>
            <div className="form-group">
              <label>目标名称</label>
              <input
                type="text"
                value={goalForm.name}
                onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
                placeholder="如：旅行基金、教育储蓄"
              />
            </div>
            <div className="form-group">
              <label>目标金额</label>
              <input
                type="number"
                value={goalForm.targetAmount}
                onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
                placeholder="¥"
              />
            </div>
            <div className="form-group">
              <label>当前存款（可选）</label>
              <input
                type="number"
                value={goalForm.currentAmount}
                onChange={(e) => setGoalForm({ ...goalForm, currentAmount: e.target.value })}
                placeholder="¥"
              />
            </div>
            <div className="form-group">
              <label>截止日期（可选）</label>
              <input
                type="date"
                value={goalForm.deadline}
                onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowGoalModal(false)}>取消</button>
              <button type="submit" onClick={handleAddGoal}>添加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;

