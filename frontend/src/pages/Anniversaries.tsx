import { useState, useEffect } from 'react';
import api from '@/services/api';
import useConfirm from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './Anniversaries.css';

interface Anniversary {
  _id: string;
  title: string;
  type: string;
  date: string;
  dateType: string;
  relatedPersonName?: string;
  description?: string;
  remindDaysBefore: number[];
  enableReminder: boolean;
  giftIdeas: string[];
  celebrationHistory: string[];
  icon?: string;
  color?: string;
  isPrivate: boolean;
  createdBy: { _id: string; username: string };
}

interface UpcomingItem {
  anniversary: Anniversary;
  daysUntil: number;
  yearsCount: number;
}

const typeOptions = [
  { value: 'birthday', label: '生日', icon: '🎂', color: '#e91e63' },
  { value: 'wedding', label: '结婚纪念日', icon: '💍', color: '#9c27b0' },
  { value: 'memorial', label: '忌日', icon: '🕯️', color: '#607d8b' },
  { value: 'dating', label: '恋爱纪念日', icon: '💕', color: '#f44336' },
  { value: 'graduation', label: '毕业纪念日', icon: '🎓', color: '#2196f3' },
  { value: 'work', label: '入职纪念日', icon: '💼', color: '#4caf50' },
  { value: 'custom', label: '自定义', icon: '⭐', color: '#ff9800' },
];

const defaultRemindDays = [7, 3, 1, 0];

const Anniversaries = () => {
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
  const [todayList, setTodayList] = useState<Anniversary[]>([]);
  const [reminders, setReminders] = useState<UpcomingItem[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAnniversary, setSelectedAnniversary] = useState<Anniversary | null>(null);
  const [filter, setFilter] = useState('all');
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { toast, hideToast, success, error } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    type: 'birthday',
    date: '',
    dateType: 'solar',
    relatedPersonName: '',
    description: '',
    remindDaysBefore: defaultRemindDays,
    enableReminder: true,
    isPrivate: false,
  });

  const [newGiftIdea, setNewGiftIdea] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allRes, upcomingRes, todayRes, remindersRes] = await Promise.all([
        api.get('/anniversaries'),
        api.get('/anniversaries/upcoming?days=60'),
        api.get('/anniversaries/today'),
        api.get('/anniversaries/reminders'),
      ]);
      setAnniversaries(Array.isArray(allRes.data) ? allRes.data : []);
      setUpcoming(Array.isArray(upcomingRes.data) ? upcomingRes.data : []);
      setTodayList(Array.isArray(todayRes.data) ? todayRes.data : []);
      setReminders(Array.isArray(remindersRes.data) ? remindersRes.data : []);
    } catch (err) {
      console.error('加载数据失败:', err);
    }
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.date) {
      error('请填写标题和日期');
      return;
    }

    try {
      await api.post('/anniversaries', formData);
      setShowCreateModal(false);
      setFormData({
        title: '',
        type: 'birthday',
        date: '',
        dateType: 'solar',
        relatedPersonName: '',
        description: '',
        remindDaysBefore: defaultRemindDays,
        enableReminder: true,
        isPrivate: false,
      });
      success('添加成功');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '添加失败');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '删除纪念日',
      message: '确定要删除此纪念日吗？',
      confirmText: '删除',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/anniversaries/${id}`);
      success('已删除');
      setShowDetailModal(false);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '删除失败');
    }
  };

  const handleAddGiftIdea = async () => {
    if (!selectedAnniversary || !newGiftIdea.trim()) return;

    try {
      await api.post(`/anniversaries/${selectedAnniversary._id}/gift-idea`, {
        idea: newGiftIdea,
      });
      setNewGiftIdea('');
      success('添加成功');
      // 刷新详情
      const res = await api.get(`/anniversaries/${selectedAnniversary._id}`);
      setSelectedAnniversary(res.data);
    } catch (err: any) {
      error(err.response?.data?.message || '添加失败');
    }
  };

  const handleRemoveGiftIdea = async (index: number) => {
    if (!selectedAnniversary) return;

    try {
      await api.delete(`/anniversaries/${selectedAnniversary._id}/gift-idea/${index}`);
      const res = await api.get(`/anniversaries/${selectedAnniversary._id}`);
      setSelectedAnniversary(res.data);
    } catch (err: any) {
      error(err.response?.data?.message || '删除失败');
    }
  };

  const getTypeInfo = (type: string) => {
    return typeOptions.find((t) => t.value === type) || typeOptions[6];
  };

  const formatDate = (dateStr: string, showYear = true) => {
    const date = new Date(dateStr);
    if (showYear) {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  };

  const getDaysUntilText = (days: number) => {
    if (days === 0) return '今天！';
    if (days === 1) return '明天';
    if (days <= 7) return `${days}天后`;
    if (days <= 30) return `${Math.ceil(days / 7)}周后`;
    return `${Math.ceil(days / 30)}个月后`;
  };

  const filteredAnniversaries = anniversaries.filter((a) => {
    if (filter === 'all') return true;
    return a.type === filter;
  });

  const openDetail = (anniversary: Anniversary) => {
    setSelectedAnniversary(anniversary);
    setShowDetailModal(true);
  };

  return (
    <div className="anniversaries-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">🎉 纪念日提醒</h1>
          <p className="page-subtitle">珍藏每一个重要时刻，不错过任何纪念日</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + 添加纪念日
        </button>
      </div>

      {/* 今日提醒 */}
      {todayList.length > 0 && (
        <div className="today-section">
          <h3>🎊 今日纪念日</h3>
          <div className="today-cards">
            {todayList.map((a) => {
              const typeInfo = getTypeInfo(a.type);
              return (
                <div
                  key={a._id}
                  className="today-card"
                  style={{ borderColor: typeInfo.color }}
                  onClick={() => openDetail(a)}
                >
                  <div className="today-icon">{typeInfo.icon}</div>
                  <div className="today-info">
                    <h4>{a.title}</h4>
                    {a.relatedPersonName && <p>{a.relatedPersonName}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 即将到来 */}
      {reminders.length > 0 && (
        <div className="reminders-section">
          <h3>⏰ 提醒</h3>
          <div className="reminder-items">
            {reminders.map((item, i) => {
              const typeInfo = getTypeInfo(item.anniversary.type);
              return (
                <div key={i} className="reminder-item">
                  <span className="reminder-icon">{typeInfo.icon}</span>
                  <span className="reminder-text">
                    <strong>{item.anniversary.title}</strong> {getDaysUntilText(item.daysUntil)}
                    {item.yearsCount > 0 && ` · 第${item.yearsCount}年`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="anniversaries-layout">
        {/* 即将到来的纪念日 */}
        <div className="upcoming-section">
          <h3>📅 即将到来</h3>
          <div className="upcoming-list">
            {upcoming.length === 0 ? (
              <div className="empty-state">近期没有纪念日</div>
            ) : (
              upcoming.slice(0, 10).map((item, i) => {
                const typeInfo = getTypeInfo(item.anniversary.type);
                return (
                  <div
                    key={i}
                    className="upcoming-item"
                    onClick={() => openDetail(item.anniversary)}
                  >
                    <div className="upcoming-date">
                      <div className="days-count">{item.daysUntil}</div>
                      <div className="days-label">天后</div>
                    </div>
                    <div className="upcoming-info">
                      <div className="upcoming-title">
                        <span className="type-icon">{typeInfo.icon}</span>
                        {item.anniversary.title}
                      </div>
                      <div className="upcoming-meta">
                        {formatDate(item.anniversary.date, false)}
                        {item.yearsCount > 0 && ` · 第${item.yearsCount}年`}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 所有纪念日 */}
        <div className="all-section">
          <div className="section-header">
            <h3>📋 所有纪念日</h3>
            <div className="filter-tabs">
              <button
                className={filter === 'all' ? 'active' : ''}
                onClick={() => setFilter('all')}
              >
                全部
              </button>
              {typeOptions.map((t) => (
                <button
                  key={t.value}
                  className={filter === t.value ? 'active' : ''}
                  onClick={() => setFilter(t.value)}
                >
                  {t.icon}
                </button>
              ))}
            </div>
          </div>

          <div className="anniversaries-grid">
            {filteredAnniversaries.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎉</div>
                <p>还没有纪念日，添加第一个吧</p>
              </div>
            ) : (
              filteredAnniversaries.map((a) => {
                const typeInfo = getTypeInfo(a.type);
                return (
                  <div
                    key={a._id}
                    className="anniversary-card"
                    style={{ borderTopColor: typeInfo.color }}
                    onClick={() => openDetail(a)}
                  >
                    <div className="card-header">
                      <span className="card-icon">{typeInfo.icon}</span>
                      <span className="card-type">{typeInfo.label}</span>
                      {a.isPrivate && <span className="private-badge">🔒</span>}
                    </div>
                    <h4 className="card-title">{a.title}</h4>
                    {a.relatedPersonName && (
                      <p className="card-person">{a.relatedPersonName}</p>
                    )}
                    <p className="card-date">{formatDate(a.date)}</p>
                    <div className="card-footer">
                      {a.enableReminder && (
                        <span className="reminder-badge">🔔 已开启提醒</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 创建纪念日模态框 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>添加纪念日</h2>
            <div className="form-group">
              <label>类型</label>
              <div className="type-grid">
                {typeOptions.map((t) => (
                  <button
                    key={t.value}
                    className={`type-btn ${formData.type === t.value ? 'active' : ''}`}
                    style={{
                      borderColor: formData.type === t.value ? t.color : 'transparent',
                      backgroundColor: formData.type === t.value ? `${t.color}15` : '',
                    }}
                    onClick={() => setFormData({ ...formData, type: t.value })}
                  >
                    <span className="type-icon">{t.icon}</span>
                    <span className="type-label">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>标题</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="如：妈妈的生日、结婚10周年"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>日期</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>日期类型</label>
                <select
                  value={formData.dateType}
                  onChange={(e) => setFormData({ ...formData, dateType: e.target.value })}
                >
                  <option value="solar">公历</option>
                  <option value="lunar">农历</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>相关人（可选）</label>
              <input
                type="text"
                value={formData.relatedPersonName}
                onChange={(e) => setFormData({ ...formData, relatedPersonName: e.target.value })}
                placeholder="谁的纪念日"
              />
            </div>
            <div className="form-group">
              <label>备注（可选）</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="添加一些描述..."
                rows={3}
              />
            </div>
            <div className="form-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.enableReminder}
                  onChange={(e) => setFormData({ ...formData, enableReminder: e.target.checked })}
                />
                开启提醒（提前 7、3、1、0 天提醒）
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isPrivate}
                  onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                />
                仅自己可见
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button type="submit" onClick={handleCreate}>
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 纪念日详情模态框 */}
      {showDetailModal && selectedAnniversary && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-detail" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header" style={{ backgroundColor: getTypeInfo(selectedAnniversary.type).color }}>
              <div className="detail-icon">{getTypeInfo(selectedAnniversary.type).icon}</div>
              <h2>{selectedAnniversary.title}</h2>
              <p>{formatDate(selectedAnniversary.date)}</p>
            </div>
            <div className="detail-body">
              <div className="detail-section">
                <h4>📝 基本信息</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">类型</span>
                    <span className="value">{getTypeInfo(selectedAnniversary.type).label}</span>
                  </div>
                  {selectedAnniversary.relatedPersonName && (
                    <div className="info-item">
                      <span className="label">相关人</span>
                      <span className="value">{selectedAnniversary.relatedPersonName}</span>
                    </div>
                  )}
                  <div className="info-item">
                    <span className="label">日期类型</span>
                    <span className="value">{selectedAnniversary.dateType === 'lunar' ? '农历' : '公历'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">提醒</span>
                    <span className="value">{selectedAnniversary.enableReminder ? '已开启' : '已关闭'}</span>
                  </div>
                </div>
                {selectedAnniversary.description && (
                  <p className="detail-description">{selectedAnniversary.description}</p>
                )}
              </div>

              <div className="detail-section">
                <h4>🎁 礼物想法</h4>
                <div className="gift-ideas">
                  {selectedAnniversary.giftIdeas.length === 0 ? (
                    <p className="empty-text">还没有礼物想法</p>
                  ) : (
                    selectedAnniversary.giftIdeas.map((idea, i) => (
                      <div key={i} className="gift-item">
                        <span>{idea}</span>
                        <button onClick={() => handleRemoveGiftIdea(i)}>×</button>
                      </div>
                    ))
                  )}
                  <div className="add-gift">
                    <input
                      type="text"
                      value={newGiftIdea}
                      onChange={(e) => setNewGiftIdea(e.target.value)}
                      placeholder="添加礼物想法..."
                      onKeyDown={(e) => e.key === 'Enter' && handleAddGiftIdea()}
                    />
                    <button onClick={handleAddGiftIdea}>添加</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="detail-footer">
              <button className="btn-delete" onClick={() => handleDelete(selectedAnniversary._id)}>
                删除
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

export default Anniversaries;

