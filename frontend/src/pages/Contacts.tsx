import { useState, useEffect } from 'react';
import api from '@/services/api';
import useConfirm from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './Contacts.css';

interface Contact {
  _id: string;
  name: string;
  relationship: string;
  category: string;
  phone: string;
  altPhone?: string;
  email?: string;
  address?: string;
  organization?: string;
  position?: string;
  notes?: string;
  isEmergency: boolean;
  isFavorite: boolean;
  priority: number;
  avatar?: string;
  tags: string[];
  createdAt: string;
}

interface Statistics {
  total: number;
  emergency: number;
  favorites: number;
  byCategory: { category: string; count: number }[];
}

const categoryConfig: Record<string, { label: string; icon: string; color: string }> = {
  medical: { label: '医疗', icon: '🏥', color: '#e74c3c' },
  education: { label: '教育', icon: '🎓', color: '#3498db' },
  service: { label: '服务', icon: '🔧', color: '#f39c12' },
  relative: { label: '亲友', icon: '👨‍👩‍👧‍👦', color: '#9b59b6' },
  work: { label: '工作', icon: '💼', color: '#1abc9c' },
  emergency: { label: '紧急服务', icon: '🚨', color: '#c0392b' },
  other: { label: '其他', icon: '📇', color: '#95a5a6' },
};

const Contacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'emergency' | 'favorites'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { toast, hideToast, success, error } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    category: 'other',
    phone: '',
    altPhone: '',
    email: '',
    address: '',
    organization: '',
    position: '',
    notes: '',
    isEmergency: false,
    isFavorite: false,
    priority: 0,
  });

  useEffect(() => {
    loadData();
  }, [activeTab, filterCategory]);

  const loadData = async () => {
    try {
      let endpoint = '/contacts';
      if (activeTab === 'emergency') {
        endpoint = '/contacts/emergency';
      } else if (activeTab === 'favorites') {
        endpoint = '/contacts/favorites';
      } else if (filterCategory) {
        endpoint = `/contacts?category=${filterCategory}`;
      }

      const [contactsRes, statsRes] = await Promise.all([
        api.get(endpoint),
        api.get('/contacts/statistics'),
      ]);

      setContacts(Array.isArray(contactsRes.data) ? contactsRes.data : []);
      setStatistics(statsRes.data);
    } catch (err) {
      console.error('加载数据失败:', err);
      setContacts([]);
    }
  };

  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      loadData();
      return;
    }

    try {
      const res = await api.get(`/contacts/search?keyword=${encodeURIComponent(searchKeyword)}`);
      setContacts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('搜索失败:', err);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      error('请填写姓名和电话');
      return;
    }

    try {
      if (editingContact) {
        await api.put(`/contacts/${editingContact._id}`, formData);
        success('更新成功');
      } else {
        await api.post('/contacts', formData);
        success('添加成功');
      }
      closeModal();
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '删除联系人',
      message: '确定要删除此联系人吗？',
      confirmText: '删除',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/contacts/${id}`);
      success('已删除');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '删除失败');
    }
  };

  const toggleEmergency = async (id: string) => {
    try {
      await api.put(`/contacts/${id}/toggle-emergency`);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const toggleFavorite = async (id: string) => {
    try {
      await api.put(`/contacts/${id}/toggle-favorite`);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      relationship: contact.relationship,
      category: contact.category,
      phone: contact.phone,
      altPhone: contact.altPhone || '',
      email: contact.email || '',
      address: contact.address || '',
      organization: contact.organization || '',
      position: contact.position || '',
      notes: contact.notes || '',
      isEmergency: contact.isEmergency,
      isFavorite: contact.isFavorite,
      priority: contact.priority,
    });
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingContact(null);
    setFormData({
      name: '',
      relationship: '',
      category: 'other',
      phone: '',
      altPhone: '',
      email: '',
      address: '',
      organization: '',
      position: '',
      notes: '',
      isEmergency: false,
      isFavorite: false,
      priority: 0,
    });
  };

  const makeCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="contacts-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">📞 紧急联系人</h1>
          <p className="page-subtitle">管理重要联系人，紧急情况快速联系</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + 添加联系人
        </button>
      </div>

      {/* 统计卡片 */}
      {statistics && (
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon">📇</div>
            <div className="stat-info">
              <div className="stat-number">{statistics.total}</div>
              <div className="stat-label">全部联系人</div>
            </div>
          </div>
          <div className="stat-card emergency">
            <div className="stat-icon">🚨</div>
            <div className="stat-info">
              <div className="stat-number">{statistics.emergency}</div>
              <div className="stat-label">紧急联系人</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-info">
              <div className="stat-number">{statistics.favorites}</div>
              <div className="stat-label">收藏</div>
            </div>
          </div>
        </div>
      )}

      {/* 搜索和筛选 */}
      <div className="toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="搜索联系人..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch}>🔍</button>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => { setActiveTab('all'); setFilterCategory(''); }}
          >
            全部
          </button>
          <button
            className={`tab emergency ${activeTab === 'emergency' ? 'active' : ''}`}
            onClick={() => { setActiveTab('emergency'); setFilterCategory(''); }}
          >
            🚨 紧急
          </button>
          <button
            className={`tab ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => { setActiveTab('favorites'); setFilterCategory(''); }}
          >
            ⭐ 收藏
          </button>
        </div>

        <select
          className="category-filter"
          value={filterCategory}
          onChange={(e) => { setFilterCategory(e.target.value); setActiveTab('all'); }}
        >
          <option value="">全部分类</option>
          {Object.entries(categoryConfig).map(([key, { label, icon }]) => (
            <option key={key} value={key}>
              {icon} {label}
            </option>
          ))}
        </select>
      </div>

      {/* 联系人列表 */}
      <div className="contacts-grid">
        {contacts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📞</div>
            <p>暂无联系人</p>
          </div>
        ) : (
          contacts.map((contact) => (
            <div
              key={contact._id}
              className={`contact-card ${contact.isEmergency ? 'emergency' : ''}`}
            >
              <div className="contact-header">
                <div
                  className="contact-avatar"
                  style={{ backgroundColor: categoryConfig[contact.category]?.color || '#95a5a6' }}
                >
                  {contact.avatar ? (
                    <img src={contact.avatar} alt={contact.name} />
                  ) : (
                    <span>{contact.name.charAt(0)}</span>
                  )}
                </div>
                <div className="contact-info">
                  <h3 className="contact-name">
                    {contact.name}
                    {contact.isEmergency && <span className="emergency-badge">紧急</span>}
                    {contact.isFavorite && <span className="favorite-icon">⭐</span>}
                  </h3>
                  <p className="contact-relationship">{contact.relationship}</p>
                </div>
                <div className="contact-category">
                  <span
                    className="category-tag"
                    style={{ backgroundColor: categoryConfig[contact.category]?.color }}
                  >
                    {categoryConfig[contact.category]?.icon} {categoryConfig[contact.category]?.label}
                  </span>
                </div>
              </div>

              <div className="contact-details">
                <div className="detail-row phone-row">
                  <span className="detail-icon">📱</span>
                  <a href={`tel:${contact.phone}`} className="phone-link">
                    {contact.phone}
                  </a>
                  <button className="call-btn" onClick={() => makeCall(contact.phone)}>
                    拨打
                  </button>
                </div>
                {contact.altPhone && (
                  <div className="detail-row">
                    <span className="detail-icon">📞</span>
                    <span>{contact.altPhone}</span>
                  </div>
                )}
                {contact.organization && (
                  <div className="detail-row">
                    <span className="detail-icon">🏢</span>
                    <span>{contact.organization} {contact.position && `- ${contact.position}`}</span>
                  </div>
                )}
                {contact.address && (
                  <div className="detail-row">
                    <span className="detail-icon">📍</span>
                    <span>{contact.address}</span>
                  </div>
                )}
                {contact.email && (
                  <div className="detail-row">
                    <span className="detail-icon">✉️</span>
                    <a href={`mailto:${contact.email}`}>{contact.email}</a>
                  </div>
                )}
                {contact.notes && (
                  <div className="detail-row notes">
                    <span className="detail-icon">📝</span>
                    <span>{contact.notes}</span>
                  </div>
                )}
              </div>

              <div className="contact-actions">
                <button
                  className={`action-btn ${contact.isEmergency ? 'active' : ''}`}
                  onClick={() => toggleEmergency(contact._id)}
                  title="标记为紧急联系人"
                >
                  🚨
                </button>
                <button
                  className={`action-btn ${contact.isFavorite ? 'active' : ''}`}
                  onClick={() => toggleFavorite(contact._id)}
                  title="收藏"
                >
                  ⭐
                </button>
                <button
                  className="action-btn"
                  onClick={() => openEditModal(contact)}
                  title="编辑"
                >
                  ✏️
                </button>
                <button
                  className="action-btn delete"
                  onClick={() => handleDelete(contact._id)}
                  title="删除"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 创建/编辑模态框 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingContact ? '编辑联系人' : '添加联系人'}</h2>
            <div className="form-row">
              <div className="form-group">
                <label>姓名 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="联系人姓名"
                />
              </div>
              <div className="form-group">
                <label>关系/职位</label>
                <input
                  type="text"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  placeholder="如：医生、老师、物业经理"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>分类</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {Object.entries(categoryConfig).map(([key, { label, icon }]) => (
                    <option key={key} value={key}>
                      {icon} {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>优先级</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                >
                  <option value={0}>普通</option>
                  <option value={1}>重要</option>
                  <option value={2}>非常重要</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>电话 *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="主电话号码"
                />
              </div>
              <div className="form-group">
                <label>备用电话</label>
                <input
                  type="tel"
                  value={formData.altPhone}
                  onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                  placeholder="备用电话号码"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>所属机构</label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  placeholder="如：XX医院、XX学校"
                />
              </div>
              <div className="form-group">
                <label>职位</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="如：主治医师"
                />
              </div>
            </div>
            <div className="form-group">
              <label>邮箱</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="电子邮箱"
              />
            </div>
            <div className="form-group">
              <label>地址</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="联系地址"
              />
            </div>
            <div className="form-group">
              <label>备注</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="其他备注信息"
                rows={2}
              />
            </div>
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isEmergency}
                  onChange={(e) => setFormData({ ...formData, isEmergency: e.target.checked })}
                />
                🚨 标记为紧急联系人
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isFavorite}
                  onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
                />
                ⭐ 添加到收藏
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={closeModal}>
                取消
              </button>
              <button type="submit" onClick={handleCreate}>
                {editingContact ? '保存' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialogComponent}
    </div>
  );
};

export default Contacts;

