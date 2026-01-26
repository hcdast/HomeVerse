import { useState, useEffect } from 'react';
import api from '@/services/api';
import useConfirm from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './Reminders.css';

interface FamilyMember {
  _id: string;
  username: string;
  avatar?: string;
}

interface Reminder {
  _id: string;
  title: string;
  description?: string;
  type: string;
  category: string;
  priority: string;
  reminderTime: string;
  advanceMinutes: number[];
  weekDays?: number[];
  monthDay?: number;
  endDate?: string;
  isActive: boolean;
  isSnoozed: boolean;
  snoozeUntil?: string;
  nextTriggerAt?: string;
  completedCount: number;
  assignees: { _id: string; username: string; avatar?: string }[];
  createdBy: { _id: string; username: string };
}

interface Statistics {
  total: number;
  active: number;
  todayCount: number;
  byCategory: { category: string; count: number }[];
  byPriority: { priority: string; count: number }[];
}

const typeOptions = [
  { value: 'one_time', label: '一次性', icon: '⏰' },
  { value: 'daily', label: '每日', icon: '📆' },
  { value: 'weekly', label: '每周', icon: '📅' },
  { value: 'monthly', label: '每月', icon: '🗓️' },
  { value: 'yearly', label: '每年', icon: '🎊' },
];

const categoryOptions = [
  { value: 'medication', label: '用药', icon: '💊', color: '#e91e63' },
  { value: 'bill', label: '账单', icon: '💳', color: '#9c27b0' },
  { value: 'birthday', label: '生日', icon: '🎂', color: '#f44336' },
  { value: 'anniversary', label: '纪念日', icon: '🎉', color: '#ff9800' },
  { value: 'appointment', label: '预约', icon: '📋', color: '#2196f3' },
  { value: 'task', label: '任务', icon: '✅', color: '#4caf50' },
  { value: 'plant', label: '浇花/宠物', icon: '🌱', color: '#8bc34a' },
  { value: 'maintenance', label: '维护', icon: '🔧', color: '#607d8b' },
  { value: 'custom', label: '自定义', icon: '⭐', color: '#795548' },
];

const priorityOptions = [
  { value: 'low', label: '低', color: '#8bc34a' },
  { value: 'medium', label: '中', color: '#ff9800' },
  { value: 'high', label: '高', color: '#f44336' },
  { value: 'urgent', label: '紧急', color: '#9c27b0' },
];

const advanceOptions = [
  { value: 0, label: '准时' },
  { value: 5, label: '5分钟前' },
  { value: 15, label: '15分钟前' },
  { value: 30, label: '30分钟前' },
  { value: 60, label: '1小时前' },
  { value: 1440, label: '1天前' },
];

const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const Reminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [todayReminders, setTodayReminders] = useState<Reminder[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [filter, setFilter] = useState('all');
  const [showSnoozeMenu, setShowSnoozeMenu] = useState<string | null>(null);
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { toast, hideToast, success, error } = useToast();

  const getDefaultFormData = () => ({
    title: '',
    description: '',
    type: 'one_time',
    category: 'custom',
    priority: 'medium',
    reminderTime: '',
    weekDays: [] as number[],
    monthDay: 1,
    advanceMinutes: [0, 15],
    assignees: [] as string[],
    endDate: '',
  });

  const [formData, setFormData] = useState(getDefaultFormData());

  useEffect(() => {
    loadData();
    loadFamilyMembers();
  }, []);

  const loadData = async () => {
    try {
      const [allRes, todayRes, upcomingRes, statsRes] = await Promise.all([
        api.get('/reminders'),
        api.get('/reminders/today'),
        api.get('/reminders/upcoming?hours=72'),
        api.get('/reminders/statistics'),
      ]);
      setReminders(Array.isArray(allRes.data) ? allRes.data : []);
      setTodayReminders(Array.isArray(todayRes.data) ? todayRes.data : []);
      setUpcomingReminders(Array.isArray(upcomingRes.data) ? upcomingRes.data : []);
      setStatistics(statsRes.data);
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
    setEditingReminder(null);
    setFormData(getDefaultFormData());
    setShowModal(true);
  };

  const handleOpenEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setFormData({
      title: reminder.title,
      description: reminder.description || '',
      type: reminder.type,
      category: reminder.category,
      priority: reminder.priority,
      reminderTime: reminder.reminderTime ? new Date(reminder.reminderTime).toISOString().slice(0, 16) : '',
      weekDays: reminder.weekDays || [],
      monthDay: reminder.monthDay || 1,
      advanceMinutes: reminder.advanceMinutes || [0, 15],
      assignees: reminder.assignees?.map(a => a._id) || [],
      endDate: reminder.endDate ? new Date(reminder.endDate).toISOString().split('T')[0] : '',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.reminderTime) {
      error('请填写标题和提醒时间');
      return;
    }

    try {
      const submitData = {
        ...formData,
        endDate: formData.endDate || undefined,
      };

      if (editingReminder) {
        await api.put(`/reminders/${editingReminder._id}`, submitData);
        success('更新成功');
      } else {
        await api.post('/reminders', submitData);
        success('创建成功');
      }
      
      setShowModal(false);
      setFormData(getDefaultFormData());
      setEditingReminder(null);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await api.post(`/reminders/${id}/complete`);
      success('已完成');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const handleSnooze = async (id: string, minutes: number) => {
    try {
      await api.post(`/reminders/${id}/snooze`, { minutes });
      success(`已延后 ${minutes >= 60 ? `${minutes / 60}小时` : `${minutes}分钟`}`);
      setShowSnoozeMenu(null);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.put(`/reminders/${id}/toggle`);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '删除提醒',
      message: '确定要删除此提醒吗？',
      confirmText: '删除',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/reminders/${id}`);
      success('已删除');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '删除失败');
    }
  };

  const toggleAdvanceMinute = (minute: number) => {
    const current = formData.advanceMinutes;
    if (current.includes(minute)) {
      setFormData({ ...formData, advanceMinutes: current.filter(m => m !== minute) });
    } else {
      setFormData({ ...formData, advanceMinutes: [...current, minute].sort((a, b) => a - b) });
    }
  };

  const toggleAssignee = (userId: string) => {
    const current = formData.assignees;
    if (current.includes(userId)) {
      setFormData({ ...formData, assignees: current.filter(id => id !== userId) });
    } else {
      setFormData({ ...formData, assignees: [...current, userId] });
    }
  };

  const getCategoryInfo = (category: string) => {
    return categoryOptions.find((c) => c.value === category) || categoryOptions[8];
  };

  const getTypeInfo = (type: string) => {
    return typeOptions.find((t) => t.value === type) || typeOptions[0];
  };

  const getPriorityInfo = (priority: string) => {
    return priorityOptions.find((p) => p.value === priority) || priorityOptions[1];
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === date.toDateString();

    const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `今天 ${timeStr}`;
    if (isTomorrow) return `明天 ${timeStr}`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) + ' ' + timeStr;
  };

  const getTimeUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) return '已过期';
    if (diff < 60000) return '即将到来';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟后`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时后`;
    return `${Math.floor(diff / 86400000)}天后`;
  };

  const filteredReminders = reminders.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'active') return r.isActive && !r.isSnoozed;
    if (filter === 'snoozed') return r.isSnoozed;
    if (filter === 'inactive') return !r.isActive;
    return r.category === filter;
  });

  const renderReminderCard = (reminder: Reminder, showActions = true, compact = false) => {
    const catInfo = getCategoryInfo(reminder.category);
    const priorityInfo = getPriorityInfo(reminder.priority);
    const typeInfo = getTypeInfo(reminder.type);

    return (
      <div
        key={reminder._id}
        className={`reminder-card ${!reminder.isActive ? 'inactive' : ''} ${reminder.isSnoozed ? 'snoozed' : ''} ${compact ? 'compact' : ''}`}
      >
        <div className="reminder-icon" style={{ backgroundColor: catInfo.color }}>
          {catInfo.icon}
        </div>
        <div className="reminder-content">
          <div className="reminder-header">
            <h4 onClick={() => handleOpenEdit(reminder)}>{reminder.title}</h4>
            <span className="priority-badge" style={{ backgroundColor: priorityInfo.color }}>
              {priorityInfo.label}
            </span>
          </div>
          {!compact && reminder.description && (
            <p className="reminder-desc">{reminder.description}</p>
          )}
          <div className="reminder-meta">
            <span className="type-tag">
              {typeInfo.icon} {typeInfo.label}
            </span>
            {reminder.nextTriggerAt && (
              <span className="next-time" title={formatTime(reminder.nextTriggerAt)}>
                ⏰ {getTimeUntil(reminder.nextTriggerAt)}
              </span>
            )}
            {reminder.completedCount > 0 && (
              <span className="completed-count">
                ✓ 已完成 {reminder.completedCount} 次
              </span>
            )}
            {reminder.assignees?.length > 0 && (
              <span className="assignees">
                👥 {reminder.assignees.map(a => a.username).join(', ')}
              </span>
            )}
          </div>
          {reminder.isSnoozed && reminder.snoozeUntil && (
            <div className="snoozed-info">
              💤 延后至 {formatTime(reminder.snoozeUntil)}
            </div>
          )}
        </div>
        {showActions && (
          <div className="reminder-actions">
            <button 
              className="action-btn complete" 
              onClick={() => handleComplete(reminder._id)}
              title="完成"
            >
              ✓
            </button>
            <div className="snooze-wrapper">
              <button 
                className="action-btn snooze" 
                onClick={() => setShowSnoozeMenu(showSnoozeMenu === reminder._id ? null : reminder._id)}
                title="延后"
              >
                ⏸
              </button>
              {showSnoozeMenu === reminder._id && (
                <div className="snooze-menu">
                  <button onClick={() => handleSnooze(reminder._id, 5)}>5分钟</button>
                  <button onClick={() => handleSnooze(reminder._id, 15)}>15分钟</button>
                  <button onClick={() => handleSnooze(reminder._id, 30)}>30分钟</button>
                  <button onClick={() => handleSnooze(reminder._id, 60)}>1小时</button>
                  <button onClick={() => handleSnooze(reminder._id, 180)}>3小时</button>
                  <button onClick={() => handleSnooze(reminder._id, 1440)}>明天</button>
                </div>
              )}
            </div>
            <button
              className={`action-btn toggle ${reminder.isActive ? 'on' : 'off'}`}
              onClick={() => handleToggle(reminder._id)}
              title={reminder.isActive ? '暂停' : '启用'}
            >
              {reminder.isActive ? '🔔' : '🔕'}
            </button>
            <button 
              className="action-btn edit" 
              onClick={() => handleOpenEdit(reminder)}
              title="编辑"
            >
              ✏️
            </button>
            <button 
              className="action-btn delete" 
              onClick={() => handleDelete(reminder._id)}
              title="删除"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="reminders-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">⏰ 智能提醒</h1>
          <p className="page-subtitle">不错过任何重要事项</p>
        </div>
        <button className="btn-primary" onClick={handleOpenCreate}>
          + 新建提醒
        </button>
      </div>

      {/* 统计面板 */}
      {statistics && (
        <div className="stats-panel">
          <div className="stat-item">
            <span className="stat-value">{statistics.total}</span>
            <span className="stat-label">总提醒</span>
          </div>
          <div className="stat-item active">
            <span className="stat-value">{statistics.active}</span>
            <span className="stat-label">活跃中</span>
          </div>
          <div className="stat-item today">
            <span className="stat-value">{statistics.todayCount}</span>
            <span className="stat-label">今日待办</span>
          </div>
          <div className="stat-item categories">
            {statistics.byCategory.slice(0, 4).map(cat => {
              const info = getCategoryInfo(cat.category);
              return (
                <span key={cat.category} className="cat-badge" style={{ backgroundColor: info.color }}>
                  {info.icon} {cat.count}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* 今日提醒 */}
      {todayReminders.length > 0 && (
        <div className="today-section">
          <h3>📅 今日提醒 <span className="count-badge">{todayReminders.length}</span></h3>
          <div className="today-list">
            {todayReminders.map((r) => renderReminderCard(r))}
          </div>
        </div>
      )}

      {/* 即将到来 */}
      {upcomingReminders.length > 0 && (
        <div className="upcoming-section">
          <h3>⏳ 即将到来</h3>
          <div className="upcoming-list">
            {upcomingReminders
              .filter(r => !todayReminders.find(t => t._id === r._id))
              .slice(0, 5)
              .map((r) => renderReminderCard(r, false, true))}
          </div>
        </div>
      )}

      {/* 分类过滤 */}
      <div className="filter-section">
        <h3>📋 所有提醒</h3>
        <div className="filter-tabs">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            全部
          </button>
          <button
            className={filter === 'active' ? 'active' : ''}
            onClick={() => setFilter('active')}
          >
            活跃
          </button>
          <button
            className={filter === 'snoozed' ? 'active' : ''}
            onClick={() => setFilter('snoozed')}
          >
            已延后
          </button>
          <button
            className={filter === 'inactive' ? 'active' : ''}
            onClick={() => setFilter('inactive')}
          >
            已暂停
          </button>
          <div className="filter-divider" />
          {categoryOptions.map((cat) => (
            <button
              key={cat.value}
              className={filter === cat.value ? 'active' : ''}
              onClick={() => setFilter(cat.value)}
              style={{ borderColor: filter === cat.value ? cat.color : 'transparent' }}
              title={cat.label}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      </div>

      {/* 提醒列表 */}
      <div className="reminders-list">
        {filteredReminders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⏰</div>
            <p>暂无提醒，创建第一个吧</p>
          </div>
        ) : (
          filteredReminders.map((r) => renderReminderCard(r))
        )}
      </div>

      {/* 创建/编辑模态框 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h2>{editingReminder ? '编辑提醒' : '新建提醒'}</h2>

            <div className="form-group">
              <label>分类</label>
              <div className="category-grid">
                {categoryOptions.map((cat) => (
                  <button
                    key={cat.value}
                    className={`category-btn ${formData.category === cat.value ? 'active' : ''}`}
                    style={{
                      borderColor: formData.category === cat.value ? cat.color : 'transparent',
                      backgroundColor: formData.category === cat.value ? `${cat.color}15` : '',
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
              <label>标题 *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="提醒内容"
              />
            </div>

            <div className="form-group">
              <label>描述（可选）</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="详细说明"
                rows={2}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>提醒类型</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  {typeOptions.map((t) => (
                    <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>优先级</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  {priorityOptions.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>提醒时间 *</label>
              <input
                type="datetime-local"
                value={formData.reminderTime}
                onChange={(e) => setFormData({ ...formData, reminderTime: e.target.value })}
              />
            </div>

            {formData.type === 'weekly' && (
              <div className="form-group">
                <label>重复日期</label>
                <div className="weekday-selector">
                  {weekDays.map((day, i) => (
                    <button
                      key={i}
                      className={formData.weekDays.includes(i) ? 'active' : ''}
                      onClick={() => {
                        const newDays = formData.weekDays.includes(i)
                          ? formData.weekDays.filter((d) => d !== i)
                          : [...formData.weekDays, i];
                        setFormData({ ...formData, weekDays: newDays });
                      }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {formData.type === 'monthly' && (
              <div className="form-group">
                <label>每月第几天</label>
                <select
                  value={formData.monthDay}
                  onChange={(e) => setFormData({ ...formData, monthDay: parseInt(e.target.value) })}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}日</option>
                  ))}
                </select>
              </div>
            )}

            {formData.type !== 'one_time' && (
              <div className="form-group">
                <label>结束日期（可选）</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            )}

            <div className="form-group">
              <label>提前提醒</label>
              <div className="advance-selector">
                {advanceOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={formData.advanceMinutes.includes(opt.value) ? 'active' : ''}
                    onClick={() => toggleAdvanceMinute(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {familyMembers.length > 0 && (
              <div className="form-group">
                <label>指派给</label>
                <div className="assignee-selector">
                  {familyMembers.map((member) => (
                    <button
                      key={member._id}
                      className={`assignee-btn ${formData.assignees.includes(member._id) ? 'active' : ''}`}
                      onClick={() => toggleAssignee(member._id)}
                    >
                      <span className="assignee-avatar">
                        {member.avatar ? <img src={member.avatar} alt="" /> : member.username.charAt(0)}
                      </span>
                      <span>{member.username}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" onClick={() => setShowModal(false)}>取消</button>
              <button type="submit" onClick={handleSubmit}>
                {editingReminder ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialogComponent}
    </div>
  );
};

export default Reminders;
