import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '@/services/api';
import './FamilySwitcher.css';

interface Family {
  _id: string;
  name: string;
  description?: string;
}

interface FamilyMembership {
  _id: string;
  familyId: Family;
  role: string;
  isDefault: boolean;
  nickname?: string;
  family: Family;
}

interface Invitation {
  _id: string;
  familyId: {
    _id: string;
    name: string;
    description?: string;
  };
  invitedBy: {
    username: string;
  };
}

const FamilySwitcher = () => {
  const [families, setFamilies] = useState<FamilyMembership[]>([]);
  const [currentFamilyId, setCurrentFamilyId] = useState<string>('');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newFamilyDesc, setNewFamilyDesc] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();

    // 点击外部关闭下拉菜单
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      const [familiesRes, invitationsRes] = await Promise.all([
        api.get('/multi-family/families'),
        api.get('/multi-family/invitations'),
      ]);

      setFamilies(familiesRes.data.families || []);
      setCurrentFamilyId(familiesRes.data.currentFamilyId || '');
      setInvitations(Array.isArray(invitationsRes.data) ? invitationsRes.data : []);
    } catch (err) {
      console.error('加载家庭数据失败:', err);
    }
  };

  const handleSwitchFamily = async (familyId: string) => {
    if (familyId === currentFamilyId) {
      setIsOpen(false);
      return;
    }

    try {
      await api.post(`/multi-family/families/${familyId}/switch`);
      setCurrentFamilyId(familyId);
      setIsOpen(false);
      // 刷新页面以加载新家庭数据
      window.location.reload();
    } catch (err) {
      console.error('切换家庭失败:', err);
    }
  };

  const handleCreateFamily = async () => {
    if (!newFamilyName.trim()) return;

    try {
      await api.post('/multi-family/families', {
        name: newFamilyName,
        description: newFamilyDesc,
      });
      setShowCreateModal(false);
      setNewFamilyName('');
      setNewFamilyDesc('');
      loadData();
    } catch (err) {
      console.error('创建家庭失败:', err);
    }
  };

  const handleAcceptInvitation = async (familyId: string) => {
    try {
      await api.post(`/multi-family/invitations/${familyId}/accept`);
      loadData();
    } catch (err) {
      console.error('接受邀请失败:', err);
    }
  };

  const handleRejectInvitation = async (familyId: string) => {
    try {
      await api.post(`/multi-family/invitations/${familyId}/reject`);
      loadData();
    } catch (err) {
      console.error('拒绝邀请失败:', err);
    }
  };

  const currentFamily = families.find(f => f.family?._id === currentFamilyId || f.familyId?._id === currentFamilyId);

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { label: string; color: string }> = {
      owner: { label: '所有者', color: '#ff4d4f' },
      admin: { label: '管理员', color: '#fa8c16' },
      editor: { label: '编辑者', color: '#1890ff' },
      viewer: { label: '访客', color: '#52c41a' },
      member: { label: '成员', color: '#999' },
    };
    return roles[role] || { label: role, color: '#999' };
  };

  return (
    <div className="family-switcher" ref={dropdownRef}>
      <button className="switcher-trigger" onClick={() => setIsOpen(!isOpen)}>
        <span className="family-icon">🏠</span>
        <span className="family-name">{currentFamily?.family?.name || currentFamily?.familyId?.name || '选择家庭'}</span>
        {invitations.length > 0 && <span className="invite-badge">{invitations.length}</span>}
        <span className="arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="switcher-dropdown">
          {/* 待处理邀请 */}
          {invitations.length > 0 && (
            <div className="dropdown-section">
              <div className="section-title">📬 待处理邀请</div>
              {invitations.map((inv) => (
                <div key={inv._id} className="invitation-item">
                  <div className="invite-info">
                    <span className="invite-family">{inv.familyId.name}</span>
                    <span className="invite-from">来自 {inv.invitedBy.username}</span>
                  </div>
                  <div className="invite-actions">
                    <button className="btn-accept" onClick={() => handleAcceptInvitation(inv.familyId._id)}>
                      ✓
                    </button>
                    <button className="btn-reject" onClick={() => handleRejectInvitation(inv.familyId._id)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 我的家庭列表 */}
          <div className="dropdown-section">
            <div className="section-title">🏠 我的家庭</div>
            {families.map((membership) => {
              const family = membership.family || membership.familyId;
              const familyId = family?._id;
              const isActive = familyId === currentFamilyId;
              const roleInfo = getRoleBadge(membership.role);

              return (
                <div
                  key={membership._id}
                  className={`family-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleSwitchFamily(familyId)}
                >
                  <div className="family-info">
                    <span className="name">{family?.name}</span>
                    <span className="role-badge" style={{ background: roleInfo.color }}>
                      {roleInfo.label}
                    </span>
                  </div>
                  {isActive && <span className="check-mark">✓</span>}
                  {membership.isDefault && <span className="default-badge">默认</span>}
                </div>
              );
            })}
          </div>

          {/* 操作按钮 */}
          <div className="dropdown-actions">
            <button className="btn-create" onClick={() => { setShowCreateModal(true); setIsOpen(false); }}>
              + 创建新家庭
            </button>
          </div>
        </div>
      )}

      {/* 创建家庭模态框 - 使用 Portal 渲染到 body */}
      {showCreateModal && createPortal(
        <div className="family-switcher-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="family-switcher-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>🏠 创建新家庭</h3>
            <div className="form-group">
              <label>家庭名称</label>
              <input
                type="text"
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
                placeholder="例如：我的小家"
              />
            </div>
            <div className="form-group">
              <label>描述（可选）</label>
              <textarea
                value={newFamilyDesc}
                onChange={(e) => setNewFamilyDesc(e.target.value)}
                placeholder="家庭简介..."
                rows={2}
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowCreateModal(false)}>取消</button>
              <button onClick={handleCreateFamily}>创建</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default FamilySwitcher;
