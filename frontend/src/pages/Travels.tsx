import { useState, useEffect } from 'react';
import api from '@/services/api';
import useConfirm from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './Travels.css';

interface Travel {
  _id: string;
  title: string;
  destination?: string;
  coverImage?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  status: string;
  budget?: number;
  expenses: { category: string; amount: number; description?: string; date?: string }[];
  itinerary: { date: string; title?: string; activities: any[] }[];
  participants: { _id: string; username: string; avatar?: string }[];
  packingList: string[];
  createdBy: { _id: string; username: string };
}

const statusOptions = [
  { value: 'planning', label: '计划中', icon: '📝', color: '#3498db' },
  { value: 'ongoing', label: '进行中', icon: '✈️', color: '#27ae60' },
  { value: 'completed', label: '已完成', icon: '✅', color: '#95a5a6' },
  { value: 'cancelled', label: '已取消', icon: '❌', color: '#e74c3c' },
];

const Travels = () => {
  const [travels, setTravels] = useState<Travel[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTravel, setSelectedTravel] = useState<Travel | null>(null);
  const [editingTravel, setEditingTravel] = useState<Travel | null>(null);
  const [filter, setFilter] = useState('all');
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { toast, hideToast, success, error } = useToast();

  const [formData, setFormData] = useState({
    title: '', destination: '', startDate: '', endDate: '', budget: '', description: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get('/travels'),
        api.get('/travels/statistics'),
      ]);
      setTravels(Array.isArray(listRes.data) ? listRes.data : []);
      setStatistics(statsRes.data);
    } catch (err) { console.error('加载失败:', err); }
  };

  const handleSubmit = async () => {
    if (!formData.title) { error('请填写标题'); return; }
    try {
      const data = { ...formData, budget: formData.budget ? parseFloat(formData.budget) : undefined };
      if (editingTravel) {
        await api.put(`/travels/${editingTravel._id}`, data);
        success('更新成功');
      } else {
        await api.post('/travels', data);
        success('创建成功');
      }
      setShowModal(false);
      loadData();
    } catch (err: any) { error(err.response?.data?.message || '操作失败'); }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({ title: '删除旅行', message: '确定要删除吗？', confirmText: '删除', type: 'danger' });
    if (!confirmed) return;
    try {
      await api.delete(`/travels/${id}`);
      success('已删除');
      setShowDetailModal(false);
      loadData();
    } catch (err: any) { error(err.response?.data?.message || '删除失败'); }
  };

  const openDetail = async (travel: Travel) => {
    try {
      const res = await api.get(`/travels/${travel._id}`);
      setSelectedTravel(res.data);
      setShowDetailModal(true);
    } catch (err) { error('加载详情失败'); }
  };

  const openEdit = () => {
    if (!selectedTravel) return;
    setEditingTravel(selectedTravel);
    setFormData({
      title: selectedTravel.title,
      destination: selectedTravel.destination || '',
      startDate: selectedTravel.startDate ? new Date(selectedTravel.startDate).toISOString().split('T')[0] : '',
      endDate: selectedTravel.endDate ? new Date(selectedTravel.endDate).toISOString().split('T')[0] : '',
      budget: selectedTravel.budget?.toString() || '',
      description: selectedTravel.description || '',
    });
    setShowModal(true);
  };

  const getStatusInfo = (status: string) => statusOptions.find(s => s.value === status) || statusOptions[0];
  const formatDate = (d: string) => new Date(d).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  const formatCurrency = (v: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(v);
  const getTotalExpenses = (expenses: any[]) => expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const filteredTravels = travels.filter(t => filter === 'all' || t.status === filter);

  return (
    <div className="travels-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">✈️ 旅行计划</h1>
          <p className="page-subtitle">记录每一次美好的旅程</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditingTravel(null); setFormData({ title: '', destination: '', startDate: '', endDate: '', budget: '', description: '' }); setShowModal(true); }}>
          + 新建旅行
        </button>
      </div>

      {statistics && (
        <div className="stats-row">
          <div className="stat-card"><span className="stat-icon">🌍</span><div className="stat-info"><span className="stat-value">{statistics.total}</span><span className="stat-label">总旅行</span></div></div>
          <div className="stat-card"><span className="stat-icon">✅</span><div className="stat-info"><span className="stat-value">{statistics.completedCount}</span><span className="stat-label">已完成</span></div></div>
          <div className="stat-card"><span className="stat-icon">📍</span><div className="stat-info"><span className="stat-value">{statistics.destinationCount}</span><span className="stat-label">目的地</span></div></div>
          <div className="stat-card"><span className="stat-icon">💰</span><div className="stat-info"><span className="stat-value">{formatCurrency(statistics.totalExpenses)}</span><span className="stat-label">总花费</span></div></div>
        </div>
      )}

      <div className="filter-tabs">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>全部</button>
        {statusOptions.map(s => (
          <button key={s.value} className={filter === s.value ? 'active' : ''} onClick={() => setFilter(s.value)}>{s.icon} {s.label}</button>
        ))}
      </div>

      <div className="travels-grid">
        {filteredTravels.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">✈️</div><p>还没有旅行计划</p></div>
        ) : (
          filteredTravels.map(travel => {
            const statusInfo = getStatusInfo(travel.status);
            return (
              <div key={travel._id} className="travel-card" onClick={() => openDetail(travel)}>
                <div className="card-cover" style={{ backgroundColor: statusInfo.color }}>
                  {travel.coverImage ? <img src={travel.coverImage} alt="" /> : <span className="cover-icon">🌍</span>}
                  <span className="status-badge" style={{ backgroundColor: statusInfo.color }}>{statusInfo.label}</span>
                </div>
                <div className="card-body">
                  <h3>{travel.title}</h3>
                  {travel.destination && <p className="destination">📍 {travel.destination}</p>}
                  {travel.startDate && (
                    <p className="dates">📅 {formatDate(travel.startDate)} {travel.endDate && `- ${formatDate(travel.endDate)}`}</p>
                  )}
                  <div className="card-footer">
                    {travel.budget && <span className="budget">预算: {formatCurrency(travel.budget)}</span>}
                    <span className="participants">{travel.participants?.length || 0} 人</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingTravel ? '编辑旅行' : '新建旅行'}</h2>
            <div className="form-group"><label>标题 *</label><input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="如：日本东京之旅" /></div>
            <div className="form-group"><label>目的地</label><input type="text" value={formData.destination} onChange={e => setFormData({ ...formData, destination: e.target.value })} /></div>
            <div className="form-row">
              <div className="form-group"><label>开始日期</label><input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} /></div>
              <div className="form-group"><label>结束日期</label><input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>预算 (¥)</label><input type="number" value={formData.budget} onChange={e => setFormData({ ...formData, budget: e.target.value })} /></div>
            <div className="form-group"><label>描述</label><textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} /></div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowModal(false)}>取消</button>
              <button type="submit" onClick={handleSubmit}>{editingTravel ? '保存' : '创建'}</button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedTravel && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-detail" onClick={e => e.stopPropagation()}>
            <div className="detail-header" style={{ backgroundColor: getStatusInfo(selectedTravel.status).color }}>
              <span className="detail-icon">✈️</span>
              <div className="detail-title">
                <h2>{selectedTravel.title}</h2>
                <p>{selectedTravel.destination}</p>
              </div>
            </div>
            <div className="detail-body">
              <div className="info-grid">
                {selectedTravel.startDate && <div className="info-item"><label>日期</label><span>{formatDate(selectedTravel.startDate)} {selectedTravel.endDate && `- ${formatDate(selectedTravel.endDate)}`}</span></div>}
                {selectedTravel.budget && <div className="info-item"><label>预算</label><span>{formatCurrency(selectedTravel.budget)}</span></div>}
                <div className="info-item"><label>已花费</label><span>{formatCurrency(getTotalExpenses(selectedTravel.expenses))}</span></div>
                <div className="info-item"><label>行程天数</label><span>{selectedTravel.itinerary?.length || 0} 天</span></div>
              </div>
              {selectedTravel.description && <div className="description"><h4>📝 描述</h4><p>{selectedTravel.description}</p></div>}
            </div>
            <div className="detail-footer">
              <button className="btn-delete" onClick={() => handleDelete(selectedTravel._id)}>🗑️ 删除</button>
              <button className="btn-edit" onClick={openEdit}>✏️ 编辑</button>
              <button onClick={() => setShowDetailModal(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialogComponent}
    </div>
  );
};

export default Travels;






