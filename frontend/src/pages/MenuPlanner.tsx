import { useState, useEffect } from 'react';
import api from '../services/api';
import './MenuPlanner.css';

interface MealItem {
  recipeId?: string;
  recipeName: string;
  note?: string;
  isCooked: boolean;
}

interface MealPlan {
  _id: string;
  date: string;
  breakfast: MealItem[];
  lunch: MealItem[];
  dinner: MealItem[];
  snack: MealItem[];
  notes?: string;
}

interface Statistics {
  totalMealsPlanned: number;
  totalMealsCooked: number;
  thisWeekPlanned: number;
  favoriteRecipes: { name: string; count: number }[];
}

const MenuPlanner = () => {
  const [currentWeek, setCurrentWeek] = useState<Date[]>([]);
  const [mealPlans, setMealPlans] = useState<Record<string, MealPlan>>({});
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMealType, setSelectedMealType] = useState<string>('');
  const [newMealName, setNewMealName] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    initWeek();
    loadStatistics();
  }, []);

  useEffect(() => {
    if (currentWeek.length > 0) {
      loadMealPlans();
    }
  }, [currentWeek]);

  const initWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));

    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      week.push(date);
    }
    setCurrentWeek(week);
  };

  const loadMealPlans = async () => {
    try {
      setLoading(true);
      const startDate = currentWeek[0].toISOString().split('T')[0];
      const endDate = currentWeek[6].toISOString().split('T')[0];

      const res = await api.get(`/menu-planner/range?startDate=${startDate}&endDate=${endDate}`);
      const plans: Record<string, MealPlan> = {};
      res.data.forEach((plan: MealPlan) => {
        const dateKey = new Date(plan.date).toISOString().split('T')[0];
        plans[dateKey] = plan;
      });
      setMealPlans(plans);
    } catch (err) {
      console.error('加载餐单失败', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const res = await api.get('/menu-planner/statistics');
      setStatistics(res.data);
    } catch (err) {
      console.error('加载统计失败', err);
    }
  };

  const changeWeek = (delta: number) => {
    const newWeek = currentWeek.map((date) => {
      const newDate = new Date(date);
      newDate.setDate(date.getDate() + delta * 7);
      return newDate;
    });
    setCurrentWeek(newWeek);
  };

  const handleAddMeal = async () => {
    if (!newMealName.trim()) return;

    try {
      await api.post(`/menu-planner/daily/${selectedDate}/${selectedMealType}`, {
        recipeName: newMealName,
      });
      setShowAddModal(false);
      setNewMealName('');
      loadMealPlans();
    } catch (err) {
      console.error('添加餐点失败', err);
    }
  };

  const handleRemoveMeal = async (date: string, mealType: string, index: number) => {
    try {
      await api.delete(`/menu-planner/daily/${date}/${mealType}/${index}`);
      loadMealPlans();
    } catch (err) {
      console.error('删除餐点失败', err);
    }
  };

  const handleMarkCooked = async (date: string, mealType: string, index: number) => {
    try {
      await api.put(`/menu-planner/daily/${date}/${mealType}/${index}/cooked`);
      loadMealPlans();
    } catch (err) {
      console.error('标记完成失败', err);
    }
  };

  const handleGenerateMenu = async () => {
    try {
      setGenerating(true);
      await api.post('/menu-planner/generate', {
        startDate: currentWeek[0].toISOString(),
        days: 7,
      });
      loadMealPlans();
    } catch (err) {
      console.error('生成菜单失败', err);
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  };

  const getDayName = (date: Date) => {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[date.getDay()];
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const mealTypes = [
    { key: 'breakfast', label: '早餐', icon: '🌅' },
    { key: 'lunch', label: '午餐', icon: '☀️' },
    { key: 'dinner', label: '晚餐', icon: '🌙' },
    { key: 'snack', label: '点心', icon: '🍪' },
  ];

  return (
    <div className="menu-planner-page">
      <div className="page-header">
        <div className="header-content">
          <h1>🍽️ 智能菜单规划</h1>
          <p>轻松规划每周美食，让做饭变得更简单</p>
        </div>
        <div className="header-actions">
          <button className="btn-generate" onClick={handleGenerateMenu} disabled={generating}>
            {generating ? '生成中...' : '✨ AI智能生成'}
          </button>
        </div>
      </div>

      {statistics && (
        <div className="stats-cards">
          <div className="stat-card">
            <span className="stat-icon">📅</span>
            <div className="stat-info">
              <span className="stat-value">{statistics.thisWeekPlanned}</span>
              <span className="stat-label">本周已规划</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">✅</span>
            <div className="stat-info">
              <span className="stat-value">{statistics.totalMealsCooked}</span>
              <span className="stat-label">已完成餐次</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">⭐</span>
            <div className="stat-info">
              <span className="stat-value">{statistics.favoriteRecipes[0]?.name || '-'}</span>
              <span className="stat-label">最爱菜品</span>
            </div>
          </div>
        </div>
      )}

      <div className="week-navigator">
        <button className="nav-btn" onClick={() => changeWeek(-1)}>
          ← 上一周
        </button>
        <span className="week-range">
          {currentWeek.length > 0 && (
            <>
              {formatDate(currentWeek[0])} - {formatDate(currentWeek[6])}
            </>
          )}
        </span>
        <button className="nav-btn" onClick={() => changeWeek(1)}>
          下一周 →
        </button>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <div className="calendar-grid">
          {currentWeek.map((date) => {
            const dateKey = date.toISOString().split('T')[0];
            const plan = mealPlans[dateKey];

            return (
              <div key={dateKey} className={`day-column ${isToday(date) ? 'today' : ''}`}>
                <div className="day-header">
                  <span className="day-name">{getDayName(date)}</span>
                  <span className="day-date">{formatDate(date)}</span>
                </div>

                {mealTypes.map((mealType) => {
                  const meals = plan?.[mealType.key as keyof MealPlan] as MealItem[] || [];

                  return (
                    <div key={mealType.key} className="meal-section">
                      <div className="meal-header">
                        <span className="meal-icon">{mealType.icon}</span>
                        <span className="meal-label">{mealType.label}</span>
                        <button
                          className="add-meal-btn"
                          onClick={() => {
                            setSelectedDate(dateKey);
                            setSelectedMealType(mealType.key);
                            setShowAddModal(true);
                          }}
                        >
                          +
                        </button>
                      </div>
                      <div className="meal-items">
                        {meals.map((meal, index) => (
                          <div
                            key={index}
                            className={`meal-item ${meal.isCooked ? 'cooked' : ''}`}
                          >
                            <span className="meal-name">{meal.recipeName}</span>
                            <div className="meal-actions">
                              {!meal.isCooked && (
                                <button
                                  className="action-btn check"
                                  onClick={() => handleMarkCooked(dateKey, mealType.key, index)}
                                  title="标记完成"
                                >
                                  ✓
                                </button>
                              )}
                              <button
                                className="action-btn delete"
                                onClick={() => handleRemoveMeal(dateKey, mealType.key, index)}
                                title="删除"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                        {meals.length === 0 && (
                          <div className="empty-meal">暂无安排</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>添加餐点</h3>
            <input
              type="text"
              value={newMealName}
              onChange={(e) => setNewMealName(e.target.value)}
              placeholder="输入菜品名称..."
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowAddModal(false)}>
                取消
              </button>
              <button className="btn-confirm" onClick={handleAddMeal}>
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuPlanner;
