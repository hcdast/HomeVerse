import { useState, useEffect } from 'react';
import api from '@/services/api';
import useConfirm from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './Pets.css';

interface HealthRecord {
  type: string;
  title: string;
  description?: string;
  date: string;
  nextDate?: string;
  veterinarian?: string;
  hospital?: string;
  cost?: number;
  weight?: number;
}

interface Pet {
  _id: string;
  name: string;
  type: string;
  breed?: string;
  avatar?: string;
  photos: string[];
  gender?: string;
  birthday?: string;
  adoptionDate?: string;
  color?: string;
  weight?: number;
  description?: string;
  healthRecords: HealthRecord[];
  feedingSchedule?: string;
  allergies: string[];
  medications: string[];
  veterinarianContact?: string;
  createdBy: { _id: string; username: string };
  tags: string[];
}

interface Statistics {
  total: number;
  byType: { type: string; count: number }[];
  totalHealthRecords: number;
  upcomingVaccinations: number;
}

const petTypeOptions = [
  { value: 'dog', label: '狗狗', icon: '🐕', color: '#8B4513' },
  { value: 'cat', label: '猫咪', icon: '🐱', color: '#FF6B6B' },
  { value: 'bird', label: '鸟类', icon: '🐦', color: '#4ECDC4' },
  { value: 'fish', label: '鱼类', icon: '🐠', color: '#45B7D1' },
  { value: 'hamster', label: '仓鼠', icon: '🐹', color: '#F7DC6F' },
  { value: 'rabbit', label: '兔子', icon: '🐰', color: '#FAD7A0' },
  { value: 'turtle', label: '乌龟', icon: '🐢', color: '#7DCEA0' },
  { value: 'other', label: '其他', icon: '🐾', color: '#95A5A6' },
];

const healthRecordTypes = [
  { value: 'vaccination', label: '疫苗接种', icon: '💉' },
  { value: 'checkup', label: '体检', icon: '🩺' },
  { value: 'treatment', label: '治疗', icon: '💊' },
  { value: 'weight', label: '体重记录', icon: '⚖️' },
  { value: 'grooming', label: '美容', icon: '✨' },
  { value: 'other', label: '其他', icon: '📝' },
];

const Pets = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [healthReminders, setHealthReminders] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { toast, hideToast, success, error } = useToast();

  const getDefaultFormData = () => ({
    name: '',
    type: 'dog',
    breed: '',
    gender: 'unknown',
    birthday: '',
    adoptionDate: '',
    color: '',
    weight: '',
    description: '',
    feedingSchedule: '',
    veterinarianContact: '',
    allergies: '',
    medications: '',
  });

  const [formData, setFormData] = useState(getDefaultFormData());
  const [healthForm, setHealthForm] = useState({
    type: 'vaccination',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    nextDate: '',
    veterinarian: '',
    hospital: '',
    cost: '',
    weight: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [petsRes, statsRes, remindersRes] = await Promise.all([
        api.get('/pets'),
        api.get('/pets/statistics'),
        api.get('/pets/health-reminders?days=30'),
      ]);
      setPets(Array.isArray(petsRes.data) ? petsRes.data : []);
      setStatistics(statsRes.data);
      setHealthReminders(Array.isArray(remindersRes.data) ? remindersRes.data : []);
    } catch (err) {
      console.error('加载数据失败:', err);
    }
  };

  const handleOpenCreate = () => {
    setEditingPet(null);
    setFormData(getDefaultFormData());
    setShowModal(true);
  };

  const handleOpenEdit = () => {
    if (!selectedPet) return;
    setEditingPet(selectedPet);
    setFormData({
      name: selectedPet.name,
      type: selectedPet.type,
      breed: selectedPet.breed || '',
      gender: selectedPet.gender || 'unknown',
      birthday: selectedPet.birthday ? new Date(selectedPet.birthday).toISOString().split('T')[0] : '',
      adoptionDate: selectedPet.adoptionDate ? new Date(selectedPet.adoptionDate).toISOString().split('T')[0] : '',
      color: selectedPet.color || '',
      weight: selectedPet.weight?.toString() || '',
      description: selectedPet.description || '',
      feedingSchedule: selectedPet.feedingSchedule || '',
      veterinarianContact: selectedPet.veterinarianContact || '',
      allergies: selectedPet.allergies?.join(', ') || '',
      medications: selectedPet.medications?.join(', ') || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      error('请填写宠物名称');
      return;
    }

    try {
      const submitData = {
        ...formData,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        allergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        medications: formData.medications ? formData.medications.split(',').map(s => s.trim()).filter(Boolean) : [],
      };

      if (editingPet) {
        await api.put(`/pets/${editingPet._id}`, submitData);
        success('更新成功');
        const res = await api.get(`/pets/${editingPet._id}`);
        setSelectedPet(res.data);
      } else {
        await api.post('/pets', submitData);
        success('添加成功');
      }

      setShowModal(false);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const handleAddHealthRecord = async () => {
    if (!selectedPet || !healthForm.title) {
      error('请填写记录标题');
      return;
    }

    try {
      await api.post(`/pets/${selectedPet._id}/health-records`, {
        ...healthForm,
        cost: healthForm.cost ? parseFloat(healthForm.cost) : undefined,
        weight: healthForm.weight ? parseFloat(healthForm.weight) : undefined,
      });
      success('记录已添加');
      setShowHealthModal(false);
      setHealthForm({
        type: 'vaccination',
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        nextDate: '',
        veterinarian: '',
        hospital: '',
        cost: '',
        weight: '',
      });
      const res = await api.get(`/pets/${selectedPet._id}`);
      setSelectedPet(res.data);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '添加失败');
    }
  };

  const handleDeleteHealthRecord = async (index: number) => {
    if (!selectedPet) return;

    const confirmed = await confirm({
      title: '删除记录',
      message: '确定要删除此健康记录吗？',
      confirmText: '删除',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/pets/${selectedPet._id}/health-records/${index}`);
      success('已删除');
      const res = await api.get(`/pets/${selectedPet._id}`);
      setSelectedPet(res.data);
    } catch (err: any) {
      error(err.response?.data?.message || '删除失败');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '删除宠物',
      message: '确定要删除此宠物档案吗？所有相关记录也将被删除。',
      confirmText: '删除',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/pets/${id}`);
      success('已删除');
      setShowDetailModal(false);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '删除失败');
    }
  };

  const openDetail = async (pet: Pet) => {
    try {
      const res = await api.get(`/pets/${pet._id}`);
      setSelectedPet(res.data);
      setShowDetailModal(true);
    } catch (err) {
      error('加载详情失败');
    }
  };

  const getTypeInfo = (type: string) => {
    return petTypeOptions.find(t => t.value === type) || petTypeOptions[7];
  };

  const getHealthTypeInfo = (type: string) => {
    return healthRecordTypes.find(t => t.value === type) || healthRecordTypes[5];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateAge = (birthday: string) => {
    const birth = new Date(birthday);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    
    if (years > 0) {
      return `${years}岁${months > 0 ? months + '个月' : ''}`;
    }
    return `${months > 0 ? months : 1}个月`;
  };

  return (
    <div className="pets-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">🐾 宠物管理</h1>
          <p className="page-subtitle">记录毛孩子的成长点滴</p>
        </div>
        <button className="btn-primary" onClick={handleOpenCreate}>
          + 添加宠物
        </button>
      </div>

      {/* 统计卡片 */}
      {statistics && (
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-icon">🐾</span>
            <div className="stat-info">
              <span className="stat-value">{statistics.total}</span>
              <span className="stat-label">宠物总数</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📋</span>
            <div className="stat-info">
              <span className="stat-value">{statistics.totalHealthRecords}</span>
              <span className="stat-label">健康记录</span>
            </div>
          </div>
          <div className="stat-card alert">
            <span className="stat-icon">💉</span>
            <div className="stat-info">
              <span className="stat-value">{statistics.upcomingVaccinations}</span>
              <span className="stat-label">待接种疫苗</span>
            </div>
          </div>
          {statistics.byType.slice(0, 3).map(item => {
            const info = getTypeInfo(item.type);
            return (
              <div key={item.type} className="stat-card mini">
                <span className="stat-icon">{info.icon}</span>
                <div className="stat-info">
                  <span className="stat-value">{item.count}</span>
                  <span className="stat-label">{info.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 健康提醒 */}
      {healthReminders.length > 0 && (
        <div className="reminders-section">
          <h3>⏰ 健康提醒</h3>
          <div className="reminders-list">
            {healthReminders.slice(0, 5).map((reminder, i) => (
              <div key={i} className="reminder-item" onClick={() => {
                const pet = pets.find(p => p._id === reminder.petId);
                if (pet) openDetail(pet);
              }}>
                <span className="reminder-pet-icon">{getTypeInfo(reminder.petType).icon}</span>
                <div className="reminder-info">
                  <strong>{reminder.petName}</strong>
                  <span>{reminder.title}</span>
                </div>
                <span className="reminder-date">{formatDate(reminder.nextDate)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 宠物列表 */}
      <div className="pets-grid">
        {pets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🐾</div>
            <p>还没有添加宠物，快来记录你的毛孩子吧</p>
          </div>
        ) : (
          pets.map((pet) => {
            const typeInfo = getTypeInfo(pet.type);
            return (
              <div key={pet._id} className="pet-card" onClick={() => openDetail(pet)}>
                <div className="pet-avatar" style={{ backgroundColor: typeInfo.color }}>
                  {pet.avatar ? (
                    <img src={pet.avatar} alt={pet.name} />
                  ) : (
                    <span>{typeInfo.icon}</span>
                  )}
                </div>
                <div className="pet-info">
                  <h3>{pet.name}</h3>
                  <p className="pet-breed">{pet.breed || typeInfo.label}</p>
                  {pet.birthday && (
                    <p className="pet-age">🎂 {calculateAge(pet.birthday)}</p>
                  )}
                  <div className="pet-tags">
                    <span className="tag gender">{pet.gender === 'male' ? '♂ 公' : pet.gender === 'female' ? '♀ 母' : '未知'}</span>
                    {pet.weight && <span className="tag weight">⚖️ {pet.weight}kg</span>}
                  </div>
                </div>
                <div className="pet-stats">
                  <span title="健康记录">📋 {pet.healthRecords?.length || 0}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 添加/编辑模态框 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingPet ? '编辑宠物' : '添加宠物'}</h2>

            <div className="form-group">
              <label>类型</label>
              <div className="type-grid">
                {petTypeOptions.map((type) => (
                  <button
                    key={type.value}
                    className={`type-btn ${formData.type === type.value ? 'active' : ''}`}
                    style={{ borderColor: formData.type === type.value ? type.color : 'transparent' }}
                    onClick={() => setFormData({ ...formData, type: type.value })}
                  >
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>名字 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如：旺财"
                />
              </div>
              <div className="form-group">
                <label>品种</label>
                <input
                  type="text"
                  value={formData.breed}
                  onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                  placeholder="如：金毛"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>性别</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="unknown">未知</option>
                  <option value="male">公</option>
                  <option value="female">母</option>
                </select>
              </div>
              <div className="form-group">
                <label>颜色</label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="如：金色"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>生日</label>
                <input
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>领养日期</label>
                <input
                  type="date"
                  value={formData.adoptionDate}
                  onChange={(e) => setFormData({ ...formData, adoptionDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>体重 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="如：5.5"
                />
              </div>
              <div className="form-group">
                <label>兽医联系方式</label>
                <input
                  type="text"
                  value={formData.veterinarianContact}
                  onChange={(e) => setFormData({ ...formData, veterinarianContact: e.target.value })}
                  placeholder="电话或地址"
                />
              </div>
            </div>

            <div className="form-group">
              <label>喂养时间表</label>
              <input
                type="text"
                value={formData.feedingSchedule}
                onChange={(e) => setFormData({ ...formData, feedingSchedule: e.target.value })}
                placeholder="如：早8点、晚6点各一次"
              />
            </div>

            <div className="form-group">
              <label>过敏源（逗号分隔）</label>
              <input
                type="text"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="如：鸡肉, 牛奶"
              />
            </div>

            <div className="form-group">
              <label>描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="介绍一下你的宠物..."
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button type="button" onClick={() => setShowModal(false)}>取消</button>
              <button type="submit" onClick={handleSubmit}>{editingPet ? '保存' : '添加'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 详情模态框 */}
      {showDetailModal && selectedPet && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-detail" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header" style={{ backgroundColor: getTypeInfo(selectedPet.type).color }}>
              <div className="detail-avatar">
                {selectedPet.avatar ? (
                  <img src={selectedPet.avatar} alt={selectedPet.name} />
                ) : (
                  <span>{getTypeInfo(selectedPet.type).icon}</span>
                )}
              </div>
              <div className="detail-title">
                <h2>{selectedPet.name}</h2>
                <p>{selectedPet.breed || getTypeInfo(selectedPet.type).label}</p>
                {selectedPet.birthday && (
                  <span className="age-badge">🎂 {calculateAge(selectedPet.birthday)}</span>
                )}
              </div>
            </div>

            <div className="detail-body">
              <div className="info-grid">
                <div className="info-item">
                  <label>性别</label>
                  <span>{selectedPet.gender === 'male' ? '♂ 公' : selectedPet.gender === 'female' ? '♀ 母' : '未知'}</span>
                </div>
                {selectedPet.weight && (
                  <div className="info-item">
                    <label>体重</label>
                    <span>{selectedPet.weight} kg</span>
                  </div>
                )}
                {selectedPet.color && (
                  <div className="info-item">
                    <label>颜色</label>
                    <span>{selectedPet.color}</span>
                  </div>
                )}
                {selectedPet.adoptionDate && (
                  <div className="info-item">
                    <label>领养日期</label>
                    <span>{formatDate(selectedPet.adoptionDate)}</span>
                  </div>
                )}
              </div>

              {selectedPet.description && (
                <div className="description-section">
                  <h4>📝 介绍</h4>
                  <p>{selectedPet.description}</p>
                </div>
              )}

              {selectedPet.feedingSchedule && (
                <div className="feeding-section">
                  <h4>🍽️ 喂养时间表</h4>
                  <p>{selectedPet.feedingSchedule}</p>
                </div>
              )}

              {selectedPet.allergies?.length > 0 && (
                <div className="allergies-section">
                  <h4>⚠️ 过敏源</h4>
                  <div className="tags-list">
                    {selectedPet.allergies.map((a, i) => (
                      <span key={i} className="tag warning">{a}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* 健康记录 */}
              <div className="health-section">
                <div className="section-header">
                  <h4>📋 健康记录</h4>
                  <button className="btn-add" onClick={() => setShowHealthModal(true)}>+ 添加记录</button>
                </div>
                {selectedPet.healthRecords?.length === 0 ? (
                  <p className="empty-text">暂无健康记录</p>
                ) : (
                  <div className="health-list">
                    {selectedPet.healthRecords?.slice().reverse().map((record, i) => {
                      const typeInfo = getHealthTypeInfo(record.type);
                      const originalIndex = selectedPet.healthRecords.length - 1 - i;
                      return (
                        <div key={i} className="health-item">
                          <span className="health-icon">{typeInfo.icon}</span>
                          <div className="health-info">
                            <strong>{record.title}</strong>
                            <span className="health-date">{formatDate(record.date)}</span>
                            {record.description && <p>{record.description}</p>}
                            {record.nextDate && (
                              <span className="next-date">下次: {formatDate(record.nextDate)}</span>
                            )}
                          </div>
                          {record.cost && <span className="health-cost">¥{record.cost}</span>}
                          <button className="btn-delete-small" onClick={() => handleDeleteHealthRecord(originalIndex)}>×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="detail-footer">
              <button className="btn-delete" onClick={() => handleDelete(selectedPet._id)}>🗑️ 删除</button>
              <button className="btn-edit" onClick={handleOpenEdit}>✏️ 编辑</button>
              <button onClick={() => setShowDetailModal(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 添加健康记录模态框 */}
      {showHealthModal && (
        <div className="modal-overlay" onClick={() => setShowHealthModal(false)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <h2>添加健康记录</h2>

            <div className="form-group">
              <label>类型</label>
              <div className="health-type-grid">
                {healthRecordTypes.map((type) => (
                  <button
                    key={type.value}
                    className={`type-btn ${healthForm.type === type.value ? 'active' : ''}`}
                    onClick={() => setHealthForm({ ...healthForm, type: type.value })}
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
                value={healthForm.title}
                onChange={(e) => setHealthForm({ ...healthForm, title: e.target.value })}
                placeholder="如：狂犬疫苗"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>日期</label>
                <input
                  type="date"
                  value={healthForm.date}
                  onChange={(e) => setHealthForm({ ...healthForm, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>下次提醒日期</label>
                <input
                  type="date"
                  value={healthForm.nextDate}
                  onChange={(e) => setHealthForm({ ...healthForm, nextDate: e.target.value })}
                />
              </div>
            </div>

            {healthForm.type === 'weight' && (
              <div className="form-group">
                <label>体重 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={healthForm.weight}
                  onChange={(e) => setHealthForm({ ...healthForm, weight: e.target.value })}
                />
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>兽医/医院</label>
                <input
                  type="text"
                  value={healthForm.hospital}
                  onChange={(e) => setHealthForm({ ...healthForm, hospital: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>费用</label>
                <input
                  type="number"
                  value={healthForm.cost}
                  onChange={(e) => setHealthForm({ ...healthForm, cost: e.target.value })}
                  placeholder="¥"
                />
              </div>
            </div>

            <div className="form-group">
              <label>备注</label>
              <textarea
                value={healthForm.description}
                onChange={(e) => setHealthForm({ ...healthForm, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="modal-actions">
              <button type="button" onClick={() => setShowHealthModal(false)}>取消</button>
              <button type="submit" onClick={handleAddHealthRecord}>添加</button>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialogComponent}
    </div>
  );
};

export default Pets;




