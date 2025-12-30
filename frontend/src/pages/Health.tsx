import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './Health.css';

const Health = () => {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast, hideToast, error } = useToast();
  const [formData, setFormData] = useState({
    userId: '',
    type: 'checkup',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    data: {},
  });

  useEffect(() => {
    loadRecords();
    loadFamilyMembers();
  }, []);

  const loadRecords = async () => {
    try {
      const response = await api.get('/health');
      console.log('健康档案API返回:', response.data);
      
      // 确保返回的是数组
      const data = Array.isArray(response.data) ? response.data : [];
      console.log('处理后的数据:', data, '数量:', data.length);
      
      setRecords(data);
    } catch (error) {
      console.error('加载失败:', error);
      setRecords([]); // 出错时设置为空数组
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
      const response = await api.post('/health', {
        ...formData,
        date: new Date(formData.date),
      });
      console.log('健康记录创建成功:', response.data);
      
      setShowCreateModal(false);
      setFormData({
        userId: '',
        type: 'checkup',
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        data: {},
      });
      
      // 重新加载数据
      await loadRecords();
      console.log('数据已刷新，当前记录数:', records.length);
    } catch (err: any) {
      console.error('创建失败:', err);
      error(err.response?.data?.message || '创建失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此记录？')) return;
    try {
      await api.delete(`/health/${id}`);
      loadRecords();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      checkup: '📋',
      medication: '💊',
      illness: '🤒',
      vaccination: '💉',
      metric: '📊',
    };
    return icons[type] || '🏥';
  };

  const getTypeName = (type: string) => {
    const names: Record<string, string> = {
      checkup: '体检',
      medication: '用药',
      illness: '疾病',
      vaccination: '疫苗',
      metric: '指标',
    };
    return names[type] || type;
  };

  return (
    <div className="health-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      <div className="page-header">
        <div>
          <h1 className="page-title">🏥 健康档案</h1>
          <p className="page-subtitle">记录家庭成员健康信息</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + 添加记录
        </button>
      </div>

      <div className="health-container card">
        <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#999' }}>
          当前记录数: {records.length}
        </div>
        
        {records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏥</div>
            <p>暂无健康记录</p>
          </div>
        ) : (
          <div className="health-records-list">
            {records.map((record) => (
              <div key={record._id} className="health-record-item">
                <div className="record-icon">{getTypeIcon(record.type)}</div>
                <div className="record-content">
                  <div className="record-header">
                    <span className="record-title">{record.title}</span>
                    <span className="record-type">{getTypeName(record.type)}</span>
                  </div>
                  {record.description && (
                    <div className="record-description">{record.description}</div>
                  )}
                  <div className="record-meta">
                    <span>📅 {new Date(record.date).toLocaleDateString('zh-CN')}</span>
                    {record.userId?.username && (
                      <span>👤 {record.userId.username}</span>
                    )}
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
            <h2>添加健康记录</h2>
            <div className="form-group">
              <label>记录对象</label>
              <select
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              >
                <option value="">本人</option>
                {familyMembers.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.username}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>记录类型</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="checkup">体检</option>
                <option value="medication">用药</option>
                <option value="illness">疾病</option>
                <option value="vaccination">疫苗</option>
                <option value="metric">健康指标</option>
              </select>
            </div>
            <div className="form-group">
              <label>标题</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="例如：年度体检、感冒就医"
              />
            </div>
            <div className="form-group">
              <label>详细描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="详细信息"
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>日期</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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

export default Health;

