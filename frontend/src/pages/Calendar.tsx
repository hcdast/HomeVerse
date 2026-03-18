import { useState, useEffect } from 'react';
import api from '@/services/api';
import useConfirm from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './Calendar.css';

interface CalendarDay {
  day: number;
  date: string;
  weekday: number;
  isWeekend: boolean;
  isToday: boolean;
  holiday?: string;
  lunarDate?: string;
  solarTerm?: string;
}

const Calendar = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { toast, hideToast, error } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    type: 'event',
    description: '',
    startDate: '',
    allDay: true,
    location: '',
  });

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const [aggregatedResp, calendarResp] = await Promise.all([
        api.get(`/calendar/aggregated/${year}/${month}`),
        api.get(`/calendar/perpetual/${year}/${month}`),
      ]);
      const events = Array.isArray(aggregatedResp.data) ? aggregatedResp.data : [];
      setEvents(events);
      setCalendarData(calendarResp.data);
    } catch (error) {
      console.error('加载数据失败:', error);
      setEvents([]);
      setCalendarData(null);
    }
  };

  const handleCreateEvent = async () => {
    try {
      await api.post('/calendar', formData);
      setShowCreateModal(false);
      setFormData({
        title: '',
        type: 'event',
        description: '',
        startDate: '',
        allDay: true,
        location: '',
      });
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '创建失败');
    }
  };

  const handleDeleteEvent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: '删除事件',
      message: '确定要删除此日历事件吗？',
      confirmText: '删除',
      type: 'danger',
    });
    if (!confirmed) return;
    
    try {
      await api.delete(`/calendar/${id}`);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '删除失败');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    try {
      await api.put(`/calendar/${id}/status`, { status: newStatus });
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="calendar-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      <div className="page-header">
        <div>
          <h1 className="page-title">📅 家庭日历</h1>
          <p className="page-subtitle">管理家庭日程和重要事件 · 含万年历功能</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + 创建事件
        </button>
      </div>

      <div className="calendar-container">
        {/* 万年历视图 */}
        <div className="perpetual-calendar card">
          <div className="calendar-header">
            <button className="month-nav-btn" onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setMonth(newDate.getMonth() - 1);
              setCurrentDate(newDate);
            }}>
              ←
            </button>
            <h2 className="calendar-title">
              {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
            </h2>
            <button className="month-nav-btn" onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setMonth(newDate.getMonth() + 1);
              setCurrentDate(newDate);
            }}>
              →
            </button>
          </div>

          {calendarData && (
            <div className="calendar-grid-container">
              {/* 星期标题 */}
              <div className="weekdays">
                {weekDays.map((day, index) => (
                  <div key={index} className={`weekday ${index === 0 || index === 6 ? 'weekend' : ''}`}>
                    {day}
                  </div>
                ))}
              </div>

              {/* 日历格子 */}
              <div className="calendar-grid">
                {/* 前面的空格 */}
                {Array.from({ length: calendarData.startWeekday }).map((_, i) => (
                  <div key={`empty-${i}`} className="calendar-day empty"></div>
                ))}

                {/* 日期 */}
                {calendarData.days.map((dayInfo: CalendarDay) => (
                  <div
                    key={dayInfo.day}
                    className={`calendar-day ${dayInfo.isToday ? 'today' : ''} ${dayInfo.isWeekend ? 'weekend' : ''}`}
                  >
                    <div className="day-number">{dayInfo.day}</div>
                    {dayInfo.lunarDate && (
                      <div className="lunar-date">{dayInfo.lunarDate}</div>
                    )}
                    {dayInfo.solarTerm && (
                      <div className="solar-term">{dayInfo.solarTerm}</div>
                    )}
                    {dayInfo.holiday && (
                      <div className="holiday">{dayInfo.holiday}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 事件列表 */}
        <div className="events-panel card">
          <h3>📌 本月事件 ({events.length})</h3>
          {events.length === 0 ? (
            <p className="empty-text">本月暂无事件</p>
          ) : (
            <div className="events-list">
              {events.map((event: any) => (
                <div 
                  key={`${event.source}-${event._id}`} 
                  className={`event-item ${event.status === 'completed' ? 'completed' : ''}`}
                  style={{ borderLeftColor: event.color || '#3498db' }}
                >
                  <span className="event-icon">{event.icon || '📌'}</span>
                  <div className="event-info">
                    <div className="event-title-row">
                      <span className="event-title">{event.title}</span>
                      <span className={`event-source-tag source-${event.source}`}>
                        {event.source === 'calendar' ? '日历' :
                         event.source === 'todo' ? '待办' :
                         event.source === 'reminder' ? '提醒' :
                         event.source === 'anniversary' ? '纪念日' : '事件'}
                      </span>
                    </div>
                    <div className="event-date">
                      {new Date(event.startDate).toLocaleDateString('zh-CN', {
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short',
                        hour: event.allDay ? undefined : '2-digit',
                        minute: event.allDay ? undefined : '2-digit'
                      })}
                    </div>
                    {event.priority && (
                      <span className={`event-priority priority-${event.priority}`}>
                        {event.priority === 'high' ? '🔴 高优先级' :
                         event.priority === 'medium' ? '🟡 中优先级' : '🟢 低优先级'}
                      </span>
                    )}
                    {event.location && (
                      <div className="event-location">📍 {event.location}</div>
                    )}
                    {event.description && (
                      <div className="event-description">{event.description}</div>
                    )}
                  </div>
                  <div className="event-actions">
                    {event.source === 'calendar' && (event.type === 'todo' || event.type === 'reminder') && (
                      <button
                        className={`status-btn ${event.status === 'completed' ? 'completed' : ''}`}
                        onClick={(e) => handleToggleStatus(event._id, event.status, e)}
                        title={event.status === 'completed' ? '标记为未完成' : '标记为完成'}
                      >
                        {event.status === 'completed' ? '✓' : '○'}
                      </button>
                    )}
                    {event.source === 'calendar' && (
                      <button
                        className="delete-event-btn"
                        onClick={(e) => handleDeleteEvent(event._id, e)}
                        title="删除事件"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 创建事件模态框 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>创建事件</h2>
            <div className="form-group">
              <label>标题</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="事件标题"
              />
            </div>
            <div className="form-group">
              <label>类型</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="event">普通事件</option>
                <option value="birthday">生日</option>
                <option value="anniversary">纪念日</option>
                <option value="todo">待办</option>
                <option value="reminder">提醒</option>
              </select>
            </div>
            <div className="form-group">
              <label>日期</label>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="事件描述"
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button type="submit" onClick={handleCreateEvent}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}
      {ConfirmDialogComponent}
    </div>
  );
};

export default Calendar;

