import { useState, useEffect } from 'react';
import api from '@/services/api';
import useConfirm from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './FamilyTree.css';

interface Member {
  _id: string;
  name: string;
  avatar?: string;
  gender?: string;
  birthday?: string;
  deathDate?: string;
  birthplace?: string;
  currentLocation?: string;
  phone?: string;
  occupation?: string;
  bio?: string;
  fatherId?: { _id: string; name: string } | string;
  motherId?: { _id: string; name: string } | string;
  spouseId?: { _id: string; name: string } | string;
  generation?: number;
  isAlive: boolean;
}

const FamilyTree = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { toast, hideToast, success, error } = useToast();

  const [formData, setFormData] = useState({
    name: '', gender: 'male', birthday: '', birthplace: '', currentLocation: '', phone: '', occupation: '', bio: '', fatherId: '', motherId: '', spouseId: '', generation: '', isAlive: true,
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [listRes, statsRes] = await Promise.all([api.get('/family-tree'), api.get('/family-tree/statistics')]);
      setMembers(Array.isArray(listRes.data) ? listRes.data : []);
      setStatistics(statsRes.data);
    } catch (err) { console.error('加载失败:', err); }
  };

  const handleSubmit = async () => {
    if (!formData.name) { error('请填写姓名'); return; }
    try {
      const data = { ...formData, generation: formData.generation ? parseInt(formData.generation) : undefined };
      if (editingMember) { await api.put(`/family-tree/${editingMember._id}`, data); success('更新成功'); }
      else { await api.post('/family-tree', data); success('添加成功'); }
      setShowModal(false); loadData();
    } catch (err: any) { error(err.response?.data?.message || '操作失败'); }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({ title: '删除成员', message: '确定要删除此成员吗？', confirmText: '删除', type: 'danger' });
    if (!confirmed) return;
    try { await api.delete(`/family-tree/${id}`); success('已删除'); setShowDetailModal(false); loadData(); } catch (err: any) { error(err.response?.data?.message || '删除失败'); }
  };

  const openDetail = async (member: Member) => {
    try { const res = await api.get(`/family-tree/${member._id}`); setSelectedMember(res.data); setShowDetailModal(true); } catch { error('加载失败'); }
  };

  const openEdit = () => {
    if (!selectedMember) return;
    setEditingMember(selectedMember);
    setFormData({
      name: selectedMember.name, gender: selectedMember.gender || 'male',
      birthday: selectedMember.birthday ? new Date(selectedMember.birthday).toISOString().split('T')[0] : '',
      birthplace: selectedMember.birthplace || '', currentLocation: selectedMember.currentLocation || '',
      phone: selectedMember.phone || '', occupation: selectedMember.occupation || '', bio: selectedMember.bio || '',
      fatherId: typeof selectedMember.fatherId === 'object' ? selectedMember.fatherId?._id : selectedMember.fatherId || '',
      motherId: typeof selectedMember.motherId === 'object' ? selectedMember.motherId?._id : selectedMember.motherId || '',
      spouseId: typeof selectedMember.spouseId === 'object' ? selectedMember.spouseId?._id : selectedMember.spouseId || '',
      generation: selectedMember.generation?.toString() || '', isAlive: selectedMember.isAlive,
    });
    setShowModal(true);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('zh-CN');
  const calculateAge = (birthday: string, deathDate?: string) => {
    const end = deathDate ? new Date(deathDate) : new Date();
    const birth = new Date(birthday);
    return Math.floor((end.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  };
  const getRelationName = (id: string | { _id: string; name: string } | undefined) => {
    if (!id) return null;
    if (typeof id === 'object') return id.name;
    const m = members.find(m => m._id === id);
    return m?.name || null;
  };

  const groupedByGeneration = members.reduce((acc, m) => {
    const gen = m.generation || 0;
    if (!acc[gen]) acc[gen] = [];
    acc[gen].push(m);
    return acc;
  }, {} as Record<number, Member[]>);

  return (
    <div className="family-tree-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      <div className="page-header">
        <div><h1 className="page-title">🌳 家族树</h1><p className="page-subtitle">记录家族血脉，传承家族记忆</p></div>
        <button className="btn-primary" onClick={() => { setEditingMember(null); setFormData({ name: '', gender: 'male', birthday: '', birthplace: '', currentLocation: '', phone: '', occupation: '', bio: '', fatherId: '', motherId: '', spouseId: '', generation: '', isAlive: true }); setShowModal(true); }}>+ 添加成员</button>
      </div>

      {statistics && (
        <div className="stats-row">
          <div className="stat-card"><span className="stat-icon">👥</span><div className="stat-info"><span className="stat-value">{statistics.totalMembers}</span><span className="stat-label">家族成员</span></div></div>
          <div className="stat-card"><span className="stat-icon">📊</span><div className="stat-info"><span className="stat-value">{statistics.generationCount}</span><span className="stat-label">辈分</span></div></div>
          <div className="stat-card"><span className="stat-icon">👨</span><div className="stat-info"><span className="stat-value">{statistics.maleCount}</span><span className="stat-label">男性</span></div></div>
          <div className="stat-card"><span className="stat-icon">👩</span><div className="stat-info"><span className="stat-value">{statistics.femaleCount}</span><span className="stat-label">女性</span></div></div>
        </div>
      )}

      <div className="tree-container">
        {Object.keys(groupedByGeneration).sort((a, b) => Number(a) - Number(b)).map(gen => (
          <div key={gen} className="generation-row">
            <div className="generation-label">第 {gen} 代</div>
            <div className="members-row">
              {groupedByGeneration[Number(gen)].map(member => (
                <div key={member._id} className={`member-card ${member.gender === 'female' ? 'female' : 'male'} ${!member.isAlive ? 'deceased' : ''}`} onClick={() => openDetail(member)}>
                  <div className="member-avatar">{member.avatar ? <img src={member.avatar} alt="" /> : <span>{member.gender === 'female' ? '👩' : '👨'}</span>}</div>
                  <div className="member-name">{member.name}</div>
                  {member.birthday && <div className="member-age">{calculateAge(member.birthday, member.deathDate)}岁</div>}
                  {!member.isAlive && <div className="deceased-badge">已故</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
        {members.length === 0 && <div className="empty-state"><div className="empty-icon">🌳</div><p>还没有添加家族成员</p></div>}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingMember ? '编辑成员' : '添加成员'}</h2>
            <div className="form-row">
              <div className="form-group"><label>姓名 *</label><input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
              <div className="form-group"><label>性别</label><select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}><option value="male">男</option><option value="female">女</option></select></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>出生日期</label><input type="date" value={formData.birthday} onChange={e => setFormData({ ...formData, birthday: e.target.value })} /></div>
              <div className="form-group"><label>辈分（代）</label><input type="number" value={formData.generation} onChange={e => setFormData({ ...formData, generation: e.target.value })} placeholder="如：3" /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>父亲</label><select value={formData.fatherId} onChange={e => setFormData({ ...formData, fatherId: e.target.value })}><option value="">选择...</option>{members.filter(m => m.gender === 'male').map(m => <option key={m._id} value={m._id}>{m.name}</option>)}</select></div>
              <div className="form-group"><label>母亲</label><select value={formData.motherId} onChange={e => setFormData({ ...formData, motherId: e.target.value })}><option value="">选择...</option>{members.filter(m => m.gender === 'female').map(m => <option key={m._id} value={m._id}>{m.name}</option>)}</select></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>配偶</label><select value={formData.spouseId} onChange={e => setFormData({ ...formData, spouseId: e.target.value })}><option value="">选择...</option>{members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}</select></div>
              <div className="form-group"><label>状态</label><select value={formData.isAlive ? 'alive' : 'deceased'} onChange={e => setFormData({ ...formData, isAlive: e.target.value === 'alive' })}><option value="alive">在世</option><option value="deceased">已故</option></select></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>出生地</label><input type="text" value={formData.birthplace} onChange={e => setFormData({ ...formData, birthplace: e.target.value })} /></div>
              <div className="form-group"><label>现居地</label><input type="text" value={formData.currentLocation} onChange={e => setFormData({ ...formData, currentLocation: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>电话</label><input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
              <div className="form-group"><label>职业</label><input type="text" value={formData.occupation} onChange={e => setFormData({ ...formData, occupation: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>简介</label><textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} rows={2} /></div>
            <div className="modal-actions"><button type="button" onClick={() => setShowModal(false)}>取消</button><button type="submit" onClick={handleSubmit}>{editingMember ? '保存' : '添加'}</button></div>
          </div>
        </div>
      )}

      {showDetailModal && selectedMember && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-detail" onClick={e => e.stopPropagation()}>
            <div className="detail-header" style={{ background: selectedMember.gender === 'female' ? 'linear-gradient(135deg, #e91e63 0%, #c2185b 100%)' : 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)' }}>
              <div className="detail-avatar">{selectedMember.avatar ? <img src={selectedMember.avatar} alt="" /> : <span>{selectedMember.gender === 'female' ? '👩' : '👨'}</span>}</div>
              <div className="detail-title"><h2>{selectedMember.name}</h2>{selectedMember.birthday && <p>{calculateAge(selectedMember.birthday, selectedMember.deathDate)}岁 · 第{selectedMember.generation || '?'}代</p>}</div>
            </div>
            <div className="detail-body">
              <div className="info-grid">
                {selectedMember.birthday && <div className="info-item"><label>出生日期</label><span>{formatDate(selectedMember.birthday)}</span></div>}
                {selectedMember.birthplace && <div className="info-item"><label>出生地</label><span>{selectedMember.birthplace}</span></div>}
                {selectedMember.currentLocation && <div className="info-item"><label>现居地</label><span>{selectedMember.currentLocation}</span></div>}
                {selectedMember.occupation && <div className="info-item"><label>职业</label><span>{selectedMember.occupation}</span></div>}
                {selectedMember.phone && <div className="info-item"><label>电话</label><span>{selectedMember.phone}</span></div>}
              </div>
              <div className="relations-section">
                <h4>👨‍👩‍👧‍👦 家庭关系</h4>
                <div className="relations-list">
                  {getRelationName(selectedMember.fatherId) && <div className="relation-item"><span className="relation-type">父亲</span><span className="relation-name">{getRelationName(selectedMember.fatherId)}</span></div>}
                  {getRelationName(selectedMember.motherId) && <div className="relation-item"><span className="relation-type">母亲</span><span className="relation-name">{getRelationName(selectedMember.motherId)}</span></div>}
                  {getRelationName(selectedMember.spouseId) && <div className="relation-item"><span className="relation-type">配偶</span><span className="relation-name">{getRelationName(selectedMember.spouseId)}</span></div>}
                </div>
              </div>
              {selectedMember.bio && <div className="bio-section"><h4>📝 简介</h4><p>{selectedMember.bio}</p></div>}
            </div>
            <div className="detail-footer"><button className="btn-delete" onClick={() => handleDelete(selectedMember._id)}>🗑️ 删除</button><button className="btn-edit" onClick={openEdit}>✏️ 编辑</button><button onClick={() => setShowDetailModal(false)}>关闭</button></div>
          </div>
        </div>
      )}

      {ConfirmDialogComponent}
    </div>
  );
};

export default FamilyTree;




