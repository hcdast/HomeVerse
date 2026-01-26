import { useState, useEffect } from 'react';
import api from '@/services/api';
import useConfirm from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './Appliances.css';

interface MaintenanceRecord {
  type: string;
  title: string;
  description?: string;
  date: string;
  nextDate?: string;
  cost?: number;
  servicePerson?: string;
  serviceCompany?: string;
}

interface Appliance {
  _id: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  image?: string;
  purchaseDate?: string;
  warrantyEndDate?: string;
  price?: number;
  location?: string;
  description?: string;
  maintenanceRecords: MaintenanceRecord[];
  maintenanceCycle?: number;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  manualUrl?: string;
  servicePhone?: string;
  status: string;
  createdBy: { _id: string; username: string };
}

interface Statistics {
  total: number;
  activeCount: number;
  totalValue: number;
  warrantyExpiringCount: number;
  maintenanceDueCount: number;
  byCategory: { category: string; count: number }[];
}

const categoryOptions = [
  { value: 'kitchen', label: '厨房电器', icon: '🍳', color: '#e74c3c' },
  { value: 'living_room', label: '客厅电器', icon: '📺', color: '#3498db' },
  { value: 'bedroom', label: '卧室电器', icon: '🛏️', color: '#9b59b6' },
  { value: 'bathroom', label: '卫浴电器', icon: '🚿', color: '#1abc9c' },
  { value: 'laundry', label: '洗衣设备', icon: '👕', color: '#2ecc71' },
  { value: 'climate', label: '温控设备', icon: '❄️', color: '#00bcd4' },
  { value: 'smart_home', label: '智能家居', icon: '🏠', color: '#ff9800' },
  { value: 'other', label: '其他', icon: '🔌', color: '#95a5a6' },
];

const maintenanceTypes = [
  { value: 'repair', label: '维修', icon: '🔧' },
  { value: 'cleaning', label: '清洁', icon: '🧹' },
  { value: 'filter_change', label: '更换滤芯', icon: '🔄' },
  { value: 'inspection', label: '检查', icon: '🔍' },
  { value: 'other', label: '其他', icon: '📝' },
];

const Appliances = () => {
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [warrantyExpiring, setWarrantyExpiring] = useState<Appliance[]>([]);
  const [maintenanceDue, setMaintenanceDue] = useState<Appliance[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [selectedAppliance, setSelectedAppliance] = useState<Appliance | null>(null);
  const [editingAppliance, setEditingAppliance] = useState<Appliance | null>(null);
  const [filter, setFilter] = useState('all');
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { toast, hideToast, success, error } = useToast();

  const getDefaultFormData = () => ({
    name: '',
    category: 'kitchen',
    brand: '',
    model: '',
    serialNumber: '',
    purchaseDate: '',
    warrantyEndDate: '',
    price: '',
    location: '',
    description: '',
    maintenanceCycle: '',
    manualUrl: '',
    servicePhone: '',
  });

  const [formData, setFormData] = useState(getDefaultFormData());
  const [maintenanceForm, setMaintenanceForm] = useState({
    type: 'repair',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    nextDate: '',
    cost: '',
    servicePerson: '',
    serviceCompany: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [listRes, statsRes, warrantyRes, maintenanceRes] = await Promise.all([
        api.get('/appliances'),
        api.get('/appliances/statistics'),
        api.get('/appliances/warranty-expiring?days=60'),
        api.get('/appliances/maintenance-due?days=30'),
      ]);
      setAppliances(Array.isArray(listRes.data) ? listRes.data : []);
      setStatistics(statsRes.data);
      setWarrantyExpiring(Array.isArray(warrantyRes.data) ? warrantyRes.data : []);
      setMaintenanceDue(Array.isArray(maintenanceRes.data) ? maintenanceRes.data : []);
    } catch (err) {
      console.error('加载数据失败:', err);
    }
  };

  const handleOpenCreate = () => {
    setEditingAppliance(null);
    setFormData(getDefaultFormData());
    setShowModal(true);
  };

  const handleOpenEdit = () => {
    if (!selectedAppliance) return;
    setEditingAppliance(selectedAppliance);
    setFormData({
      name: selectedAppliance.name,
      category: selectedAppliance.category,
      brand: selectedAppliance.brand || '',
      model: selectedAppliance.model || '',
      serialNumber: selectedAppliance.serialNumber || '',
      purchaseDate: selectedAppliance.purchaseDate ? new Date(selectedAppliance.purchaseDate).toISOString().split('T')[0] : '',
      warrantyEndDate: selectedAppliance.warrantyEndDate ? new Date(selectedAppliance.warrantyEndDate).toISOString().split('T')[0] : '',
      price: selectedAppliance.price?.toString() || '',
      location: selectedAppliance.location || '',
      description: selectedAppliance.description || '',
      maintenanceCycle: selectedAppliance.maintenanceCycle?.toString() || '',
      manualUrl: selectedAppliance.manualUrl || '',
      servicePhone: selectedAppliance.servicePhone || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      error('请填写家电名称');
      return;
    }

    try {
      const submitData = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : undefined,
        maintenanceCycle: formData.maintenanceCycle ? parseInt(formData.maintenanceCycle) : undefined,
      };

      if (editingAppliance) {
        await api.put(`/appliances/${editingAppliance._id}`, submitData);
        success('更新成功');
        const res = await api.get(`/appliances/${editingAppliance._id}`);
        setSelectedAppliance(res.data);
      } else {
        await api.post('/appliances', submitData);
        success('添加成功');
      }

      setShowModal(false);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const handleAddMaintenance = async () => {
    if (!selectedAppliance || !maintenanceForm.title) {
      error('请填写维护标题');
      return;
    }

    try {
      await api.post(`/appliances/${selectedAppliance._id}/maintenance-records`, {
        ...maintenanceForm,
        cost: maintenanceForm.cost ? parseFloat(maintenanceForm.cost) : undefined,
      });
      success('记录已添加');
      setShowMaintenanceModal(false);
      setMaintenanceForm({
        type: 'repair',
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        nextDate: '',
        cost: '',
        servicePerson: '',
        serviceCompany: '',
      });
      const res = await api.get(`/appliances/${selectedAppliance._id}`);
      setSelectedAppliance(res.data);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '添加失败');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '删除家电',
      message: '确定要删除此家电记录吗？',
      confirmText: '删除',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/appliances/${id}`);
      success('已删除');
      setShowDetailModal(false);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '删除失败');
    }
  };

  const openDetail = async (appliance: Appliance) => {
    try {
      const res = await api.get(`/appliances/${appliance._id}`);
      setSelectedAppliance(res.data);
      setShowDetailModal(true);
    } catch (err) {
      error('加载详情失败');
    }
  };

  const getCategoryInfo = (category: string) => {
    return categoryOptions.find(c => c.value === category) || categoryOptions[7];
  };

  const getMaintenanceTypeInfo = (type: string) => {
    return maintenanceTypes.find(t => t.value === type) || maintenanceTypes[4];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value);
  };

  const getWarrantyStatus = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { text: '已过保', color: '#e74c3c' };
    if (days <= 30) return { text: `${days}天后过保`, color: '#f39c12' };
    if (days <= 90) return { text: `${days}天后过保`, color: '#3498db' };
    return { text: '保修中', color: '#27ae60' };
  };

  const filteredAppliances = appliances.filter(a => {
    if (filter === 'all') return true;
    return a.category === filter;
  });

  return (
    <div className="appliances-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">🔌 家电管理</h1>
          <p className="page-subtitle">记录家电信息，及时维护保养</p>
        </div>
        <button className="btn-primary" onClick={handleOpenCreate}>
          + 添加家电
        </button>
      </div>

      {/* 统计卡片 */}
      {statistics && (
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-icon">🔌</span>
            <div className="stat-info">
              <span className="stat-value">{statistics.total}</span>
              <span className="stat-label">家电总数</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">💰</span>
            <div className="stat-info">
              <span className="stat-value">{formatCurrency(statistics.totalValue)}</span>
              <span className="stat-label">总价值</span>
            </div>
          </div>
          {statistics.warrantyExpiringCount > 0 && (
            <div className="stat-card alert">
              <span className="stat-icon">⚠️</span>
              <div className="stat-info">
                <span className="stat-value">{statistics.warrantyExpiringCount}</span>
                <span className="stat-label">即将过保</span>
              </div>
            </div>
          )}
          {statistics.maintenanceDueCount > 0 && (
            <div className="stat-card warning">
              <span className="stat-icon">🔧</span>
              <div className="stat-info">
                <span className="stat-value">{statistics.maintenanceDueCount}</span>
                <span className="stat-label">待维护</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 提醒区域 */}
      {(warrantyExpiring.length > 0 || maintenanceDue.length > 0) && (
        <div className="alerts-section">
          {warrantyExpiring.length > 0 && (
            <div className="alert-box warranty">
              <h4>⚠️ 保修即将到期</h4>
              <div className="alert-list">
                {warrantyExpiring.slice(0, 3).map(a => (
                  <div key={a._id} className="alert-item" onClick={() => openDetail(a)}>
                    <span>{getCategoryInfo(a.category).icon} {a.name}</span>
                    <span className="alert-date">{formatDate(a.warrantyEndDate!)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {maintenanceDue.length > 0 && (
            <div className="alert-box maintenance">
              <h4>🔧 待维护</h4>
              <div className="alert-list">
                {maintenanceDue.slice(0, 3).map(a => (
                  <div key={a._id} className="alert-item" onClick={() => openDetail(a)}>
                    <span>{getCategoryInfo(a.category).icon} {a.name}</span>
                    <span className="alert-date">{formatDate(a.nextMaintenanceDate!)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 分类过滤 */}
      <div className="filter-tabs">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>全部</button>
        {categoryOptions.map(cat => (
          <button
            key={cat.value}
            className={filter === cat.value ? 'active' : ''}
            onClick={() => setFilter(cat.value)}
            title={cat.label}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      {/* 家电列表 */}
      <div className="appliances-grid">
        {filteredAppliances.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔌</div>
            <p>还没有添加家电</p>
          </div>
        ) : (
          filteredAppliances.map(appliance => {
            const catInfo = getCategoryInfo(appliance.category);
            const warrantyStatus = appliance.warrantyEndDate ? getWarrantyStatus(appliance.warrantyEndDate) : null;
            return (
              <div key={appliance._id} className="appliance-card" onClick={() => openDetail(appliance)}>
                <div className="card-icon" style={{ backgroundColor: catInfo.color }}>
                  {catInfo.icon}
                </div>
                <div className="card-info">
                  <h3>{appliance.name}</h3>
                  <p className="brand">{appliance.brand} {appliance.model}</p>
                  {appliance.location && <p className="location">📍 {appliance.location}</p>}
                  <div className="card-tags">
                    {warrantyStatus && (
                      <span className="tag" style={{ backgroundColor: warrantyStatus.color + '20', color: warrantyStatus.color }}>
                        {warrantyStatus.text}
                      </span>
                    )}
                    {appliance.status === 'broken' && (
                      <span className="tag broken">故障</span>
                    )}
                  </div>
                </div>
                {appliance.price && (
                  <div className="card-price">{formatCurrency(appliance.price)}</div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 添加/编辑模态框 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingAppliance ? '编辑家电' : '添加家电'}</h2>

            <div className="form-group">
              <label>分类</label>
              <div className="category-grid">
                {categoryOptions.map(cat => (
                  <button
                    key={cat.value}
                    className={`category-btn ${formData.category === cat.value ? 'active' : ''}`}
                    style={{ borderColor: formData.category === cat.value ? cat.color : 'transparent' }}
                    onClick={() => setFormData({ ...formData, category: cat.value })}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如：海尔冰箱"
                />
              </div>
              <div className="form-group">
                <label>品牌</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={e => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="如：海尔"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>型号</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={e => setFormData({ ...formData, model: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>序列号</label>
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>购买日期</label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>保修到期日</label>
                <input
                  type="date"
                  value={formData.warrantyEndDate}
                  onChange={e => setFormData({ ...formData, warrantyEndDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>价格 (¥)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>放置位置</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder="如：厨房"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>维护周期 (天)</label>
                <input
                  type="number"
                  value={formData.maintenanceCycle}
                  onChange={e => setFormData({ ...formData, maintenanceCycle: e.target.value })}
                  placeholder="如：90"
                />
              </div>
              <div className="form-group">
                <label>售后电话</label>
                <input
                  type="text"
                  value={formData.servicePhone}
                  onChange={e => setFormData({ ...formData, servicePhone: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>说明书链接</label>
              <input
                type="url"
                value={formData.manualUrl}
                onChange={e => setFormData({ ...formData, manualUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="form-group">
              <label>备注</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="modal-actions">
              <button type="button" onClick={() => setShowModal(false)}>取消</button>
              <button type="submit" onClick={handleSubmit}>{editingAppliance ? '保存' : '添加'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 详情模态框 */}
      {showDetailModal && selectedAppliance && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-detail" onClick={e => e.stopPropagation()}>
            <div className="detail-header" style={{ backgroundColor: getCategoryInfo(selectedAppliance.category).color }}>
              <span className="detail-icon">{getCategoryInfo(selectedAppliance.category).icon}</span>
              <div className="detail-title">
                <h2>{selectedAppliance.name}</h2>
                <p>{selectedAppliance.brand} {selectedAppliance.model}</p>
              </div>
            </div>

            <div className="detail-body">
              <div className="info-grid">
                {selectedAppliance.location && (
                  <div className="info-item">
                    <label>位置</label>
                    <span>📍 {selectedAppliance.location}</span>
                  </div>
                )}
                {selectedAppliance.purchaseDate && (
                  <div className="info-item">
                    <label>购买日期</label>
                    <span>{formatDate(selectedAppliance.purchaseDate)}</span>
                  </div>
                )}
                {selectedAppliance.warrantyEndDate && (
                  <div className="info-item">
                    <label>保修到期</label>
                    <span style={{ color: getWarrantyStatus(selectedAppliance.warrantyEndDate).color }}>
                      {formatDate(selectedAppliance.warrantyEndDate)}
                    </span>
                  </div>
                )}
                {selectedAppliance.price && (
                  <div className="info-item">
                    <label>价格</label>
                    <span>{formatCurrency(selectedAppliance.price)}</span>
                  </div>
                )}
                {selectedAppliance.servicePhone && (
                  <div className="info-item">
                    <label>售后电话</label>
                    <span>📞 {selectedAppliance.servicePhone}</span>
                  </div>
                )}
                {selectedAppliance.serialNumber && (
                  <div className="info-item">
                    <label>序列号</label>
                    <span>{selectedAppliance.serialNumber}</span>
                  </div>
                )}
              </div>

              {selectedAppliance.manualUrl && (
                <a href={selectedAppliance.manualUrl} target="_blank" rel="noopener noreferrer" className="manual-link">
                  📖 查看说明书
                </a>
              )}

              {/* 维护记录 */}
              <div className="maintenance-section">
                <div className="section-header">
                  <h4>🔧 维护记录</h4>
                  <button className="btn-add" onClick={() => setShowMaintenanceModal(true)}>+ 添加</button>
                </div>
                {selectedAppliance.maintenanceRecords?.length === 0 ? (
                  <p className="empty-text">暂无维护记录</p>
                ) : (
                  <div className="maintenance-list">
                    {selectedAppliance.maintenanceRecords?.slice().reverse().map((record, i) => (
                      <div key={i} className="maintenance-item">
                        <span className="maintenance-icon">{getMaintenanceTypeInfo(record.type).icon}</span>
                        <div className="maintenance-info">
                          <strong>{record.title}</strong>
                          <span className="maintenance-date">{formatDate(record.date)}</span>
                          {record.description && <p>{record.description}</p>}
                        </div>
                        {record.cost && <span className="maintenance-cost">{formatCurrency(record.cost)}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="detail-footer">
              <button className="btn-delete" onClick={() => handleDelete(selectedAppliance._id)}>🗑️ 删除</button>
              <button className="btn-edit" onClick={handleOpenEdit}>✏️ 编辑</button>
              <button onClick={() => setShowDetailModal(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 添加维护记录模态框 */}
      {showMaintenanceModal && (
        <div className="modal-overlay" onClick={() => setShowMaintenanceModal(false)}>
          <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
            <h2>添加维护记录</h2>

            <div className="form-group">
              <label>类型</label>
              <div className="maintenance-type-grid">
                {maintenanceTypes.map(type => (
                  <button
                    key={type.value}
                    className={`type-btn ${maintenanceForm.type === type.value ? 'active' : ''}`}
                    onClick={() => setMaintenanceForm({ ...maintenanceForm, type: type.value })}
                  >
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>标题 *</label>
              <input
                type="text"
                value={maintenanceForm.title}
                onChange={e => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })}
                placeholder="如：更换空调滤网"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>日期</label>
                <input
                  type="date"
                  value={maintenanceForm.date}
                  onChange={e => setMaintenanceForm({ ...maintenanceForm, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>下次提醒</label>
                <input
                  type="date"
                  value={maintenanceForm.nextDate}
                  onChange={e => setMaintenanceForm({ ...maintenanceForm, nextDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>服务商</label>
                <input
                  type="text"
                  value={maintenanceForm.serviceCompany}
                  onChange={e => setMaintenanceForm({ ...maintenanceForm, serviceCompany: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>费用 (¥)</label>
                <input
                  type="number"
                  value={maintenanceForm.cost}
                  onChange={e => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>备注</label>
              <textarea
                value={maintenanceForm.description}
                onChange={e => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="modal-actions">
              <button type="button" onClick={() => setShowMaintenanceModal(false)}>取消</button>
              <button type="submit" onClick={handleAddMaintenance}>添加</button>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialogComponent}
    </div>
  );
};

export default Appliances;




