import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './Growth.css';

const Growth = () => {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const { toast, hideToast, error } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    childId: '',
    date: new Date().toISOString().split('T')[0],
    height: '',
    weight: '',
    milestone: '',
    notes: '',
  });

  useEffect(() => {
    loadRecords();
    loadFamilyMembers();
  }, []);

  const loadRecords = async () => {
    try {
      const response = await api.get('/growth');
      const data = Array.isArray(response.data) ? response.data : [];
      setRecords(data);
    } catch (error) {
      console.error('加载失败:', error);
      setRecords([]);
    }
  };

  const loadFamilyMembers = async () => {
    try {
      if (user?.familyId) {
        const response = await api.get(`/families/${user.familyId}/members`);
        const data = Array.isArray(response.data) ? response.data : [];
        setFamilyMembers(data);
      }
    } catch (error) {
      console.error('加载家庭成员失败:', error);
      setFamilyMembers([]);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/growth', {
        ...formData,
        height: formData.height ? Number(formData.height) : undefined,
        weight: formData.weight ? Number(formData.weight) : undefined,
        date: new Date(formData.date),
      });
      setShowCreateModal(false);
      setFormData({
        childId: '',
        date: new Date().toISOString().split('T')[0],
        height: '',
        weight: '',
        milestone: '',
        notes: '',
      });
      loadRecords();
    } catch (err: any) {
      error(err.response?.data?.message || '创建失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此记录？')) return;
    try {
      await api.delete(`/growth/${id}`);
      loadRecords();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  return (
    <div className="growth-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      <div className="page-header">
        <div>
          <h1 className="page-title">👶 成长记录</h1>
          <p className="page-subtitle">记录孩子的成长轨迹</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + 添加记录
        </button>
      </div>

      <div className="growth-container card">
        {records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👶</div>
            <p>暂无成长记录，开始记录宝宝的成长吧！</p>
          </div>
        ) : (
          <div className="growth-records-list">
            {records.map((record) => (
              <div key={record._id} className="growth-record-item">
                <div className="record-date">
                  <div className="date-day">{new Date(record.date).getDate()}</div>
                  <div className="date-month">
                    {new Date(record.date).getMonth() + 1}月
                  </div>
                </div>
                <div className="record-content">
                  <div className="record-metrics">
                    {record.height && (
                      <span className="metric">📏 {record.height}cm</span>
                    )}
                    {record.weight && (
                      <span className="metric">⚖️ {record.weight}kg</span>
                    )}
                  </div>
                  {record.milestone && (
                    <div className="milestone">🎉 {record.milestone}</div>
                  )}
                  {record.notes && (
                    <div className="record-notes">{record.notes}</div>
                  )}
                  <div className="record-footer">
                    <span>👤 {record.childId?.username || '宝宝'}</span>
                    <span>📝 {record.createdBy?.username}</span>
                  </div>
                </div>
                <button className="delete-btn" onClick={() => handleDelete(record._id)}>
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>添加成长记录</h2>
            <div className="form-group">
              <label>记录对象</label>
              <select
                value={formData.childId}
                onChange={(e) => setFormData({ ...formData, childId: e.target.value })}
              >
                <option value="">选择孩子</option>
                {familyMembers.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.username}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>日期</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>身高（cm）</label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                placeholder="例如：75"
                step="0.1"
              />
            </div>
            <div className="form-group">
              <label>体重（kg）</label>
              <input
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                placeholder="例如：10.5"
                step="0.1"
              />
            </div>
            <div className="form-group">
              <label>里程碑事件</label>
              <input
                type="text"
                value={formData.milestone}
                onChange={(e) => setFormData({ ...formData, milestone: e.target.value })}
                placeholder="例如：第一次走路、第一次说话"
              />
            </div>
            <div className="form-group">
              <label>备注</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="其他说明"
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button type="submit" onClick={handleCreate}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Growth;

