import { useEffect, useState } from 'react';
import familyService, { FamilyMember, UserRole, RoleDescriptions, RoleIcons, RoleColors } from '../services/familyService';
import { useAuthStore } from '../store/authStore';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import './FamilyMembers.css';

const FamilyMembers = () => {
  const { user } = useAuthStore();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.MEMBER);
  const [submitting, setSubmitting] = useState(false);
  const { toast, success, error, hideToast } = useToast();

  // 自定义权限状态
  const [customPermissions, setCustomPermissions] = useState({
    albums: { read: false, write: false, delete: false },
    files: { read: false, write: false, delete: false },
    articles: { read: false, write: false, delete: false },
    members: { read: false, write: false, delete: false },
  });

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      if (!user?.familyId) {
        setLoading(false);
        return;
      }

      const data = await familyService.getMembers(user.familyId);
      setMembers(data);
    } catch (err: any) {
      console.error('加载成员失败:', err);
      error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 邀请成员
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证邮箱格式
    if (!inviteEmail.trim()) {
      error('请输入邮箱地址');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      error('邮箱格式不正确');
      return;
    }

    setSubmitting(true);
    try {
      const result = await familyService.inviteMember(user!.familyId!, inviteEmail, inviteRole);
      
      // 根据结果显示不同的消息
      if ('user' in result && result.user) {
        success(`邀请成功！${result.user.username} 已加入家庭`);
      } else if (result.inviteToken) {
        success('该邮箱未注册。已生成邀请链接，请让对方先注册账号');
      } else {
        success(result.message || '邀请成功！');
      }
      
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole(UserRole.MEMBER);
      
      // 刷新成员列表
      await loadMembers();
    } catch (err: any) {
      console.error('邀请失败:', err);
      error(err.message || '邀请失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 更新角色
  const handleUpdateRole = async (newRole: UserRole) => {
    if (!selectedMember) return;

    // 如果角色没有变化，直接关闭
    if (selectedMember.role === newRole) {
      setShowRoleModal(false);
      setSelectedMember(null);
      return;
    }

    // 确认角色变更
    const confirmMessage = `确定要将 ${selectedMember.username} 的角色从 ${RoleDescriptions[selectedMember.role]} 改为 ${RoleDescriptions[newRole]} 吗？\n\n` +
      `这将重置该成员的自定义权限为角色默认权限。`;
    
    if (!confirm(confirmMessage)) return;

    setSubmitting(true);
    try {
      await familyService.updateMemberRole(
        user!.familyId!,
        selectedMember._id,
        newRole
      );
      
      success(`${selectedMember.username} 的角色已更新为 ${RoleDescriptions[newRole]}`);
      setShowRoleModal(false);
      setSelectedMember(null);
      
      // 刷新成员列表
      await loadMembers();
    } catch (err: any) {
      console.error('更新角色失败:', err);
      error(err.message || '更新角色失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 更新自定义权限
  const handleUpdatePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    setSubmitting(true);
    try {
      await familyService.updateMemberPermissions(
        user!.familyId!,
        selectedMember._id,
        customPermissions
      );
      
      success(`${selectedMember.username} 的权限已更新`);
      setShowPermissionsModal(false);
      setSelectedMember(null);
      
      // 刷新成员列表
      await loadMembers();
    } catch (err: any) {
      console.error('更新权限失败:', err);
      error(err.message || '更新权限失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 移除成员
  const handleRemoveMember = async (member: FamilyMember) => {
    // 二次确认
    const confirmMessage = `确定要移除成员 ${member.username} 吗？\n\n` +
      `该成员将失去以下权限：\n` +
      `- 访问家庭相册和文件\n` +
      `- 查看家庭文章\n` +
      `- 查看家庭成员\n\n` +
      `此操作不可撤销！`;
    
    if (!confirm(confirmMessage)) return;

    setSubmitting(true);
    try {
      const result = await familyService.removeMember(user!.familyId!, member._id);
      success('message' in result ? result.message : `成员 ${member.username} 已移除`);
      
      // 刷新成员列表
      await loadMembers();
    } catch (err: any) {
      console.error('移除成员失败:', err);
      error(err.message || '移除失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 转让所有权
  const handleTransferOwnership = async (member: FamilyMember) => {
    // 详细的确认提示
    const confirmMessage = `⚠️ 重要操作确认\n\n` +
      `您即将将家庭所有权转让给：${member.username}\n\n` +
      `转让后的变化：\n` +
      `- 您的角色将变为"管理员"\n` +
      `- ${member.username} 将成为"所有者"\n` +
      `- 您将失去转让所有权的权限\n` +
      `- ${member.username} 将拥有完全控制权\n\n` +
      `此操作不可撤销！\n\n` +
      `确定要继续吗？`;
    
    if (!confirm(confirmMessage)) return;

    // 第二次确认
    if (!confirm(`最后确认：真的要将所有权转让给 ${member.username} 吗？`)) return;

    setSubmitting(true);
    try {
      const result = await familyService.transferOwnership(user!.familyId!, member._id);
      
      success(result.message || '所有权转让成功！页面即将刷新...');
      
      // 等待2秒后刷新页面，让用户看到成功消息
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
      // 同时刷新成员列表
      await loadMembers();
    } catch (err: any) {
      console.error('转让所有权失败:', err);
      error(err.message || '转让所有权失败，请重试');
      setSubmitting(false);
    }
  };

  // 打开角色编辑
  const openRoleModal = (member: FamilyMember) => {
    setSelectedMember(member);
    setShowRoleModal(true);
  };

  // 打开权限编辑
  const openPermissionsModal = (member: FamilyMember) => {
    setSelectedMember(member);
    setCustomPermissions({
      albums: member.permissions?.albums || { read: false, write: false, delete: false },
      files: member.permissions?.files || { read: false, write: false, delete: false },
      articles: member.permissions?.articles || { read: false, write: false, delete: false },
      members: member.permissions?.members || { read: false, write: false, delete: false },
    });
    setShowPermissionsModal(true);
  };

  // 检查权限
  const canManageMembers = () => {
    return user?.role === UserRole.OWNER || user?.role === UserRole.ADMIN;
  };

  const canRemoveMember = (member: FamilyMember) => {
    if (member.role === UserRole.OWNER) return false;
    return user?.role === UserRole.OWNER || user?.role === UserRole.ADMIN;
  };

  if (loading) {
    return (
      <div className="family-members-page">
        <div className="loading-state">加载中...</div>
      </div>
    );
  }

  if (!user?.familyId) {
    return (
      <div className="family-members-page">
        <div className="page-header">
          <div>
            <h1>家庭成员管理</h1>
            <p className="page-subtitle">管理家庭成员和权限</p>
          </div>
        </div>
        <div className="empty-family-state">
          <div className="empty-icon">👥</div>
          <h3>您还未加入任何家庭</h3>
          <p>请先创建或加入一个家庭</p>
        </div>
      </div>
    );
  }

  return (
    <div className="family-members-page">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}

      <div className="page-header">
        <div>
          <h1>家庭成员管理</h1>
          <p className="page-subtitle">管理家庭成员和权限 ({members.length} 位成员)</p>
        </div>
        {canManageMembers() && (
          <button onClick={() => setShowInviteModal(true)} className="invite-btn">
            + 邀请成员
          </button>
        )}
      </div>

      {members.length === 0 ? (
        <div className="empty-members-state">
          <div className="empty-icon">👤</div>
          <h3>暂无成员</h3>
          <p>点击上方"邀请成员"按钮开始添加家庭成员</p>
        </div>
      ) : (
        <div className="members-grid">
        {members.map((member) => (
          <div key={member._id} className="member-card">
            <div className="member-header">
              <div className="member-avatar">
                {member.avatar ? (
                  <img src={member.avatar} alt={member.username} />
                ) : (
                  <div className="avatar-placeholder">
                    {member.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="member-info">
                <h3>{member.username}</h3>
                <p className="member-email">{member.email}</p>
              </div>
            </div>

            <div className="member-role">
              <span
                className="role-badge"
                style={{ backgroundColor: RoleColors[member.role] }}
              >
                {RoleIcons[member.role]} {RoleDescriptions[member.role]}
              </span>
            </div>

            {canManageMembers() && member._id !== user?._id && (
              <div className="member-actions">
                <button
                  className="action-btn edit-btn"
                  onClick={() => openRoleModal(member)}
                  disabled={member.role === UserRole.OWNER}
                  title="编辑角色"
                >
                  编辑角色
                </button>
                <button
                  className="action-btn permission-btn"
                  onClick={() => openPermissionsModal(member)}
                  title="自定义权限"
                >
                  权限设置
                </button>
                {user?.role === UserRole.OWNER && member.role !== UserRole.OWNER && (
                  <button
                    className="action-btn transfer-btn"
                    onClick={() => handleTransferOwnership(member)}
                    title="转让所有权"
                  >
                    转让所有权
                  </button>
                )}
                {canRemoveMember(member) && (
                  <button
                    className="action-btn remove-btn"
                    onClick={() => handleRemoveMember(member)}
                    title="移除成员"
                  >
                    移除
                  </button>
                )}
              </div>
            )}

            {member._id === user?._id && (
              <div className="current-user-badge">当前用户</div>
            )}
          </div>
        ))}
        </div>
      )}

      {/* 邀请成员模态框 */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>邀请成员</h2>
            <form onSubmit={handleInvite}>
              <div className="form-group">
                <label>邮箱地址</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="输入成员邮箱"
                  required
                />
              </div>

              <div className="form-group">
                <label>角色</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                >
                  <option value={UserRole.MEMBER}>{RoleDescriptions[UserRole.MEMBER]}</option>
                  <option value={UserRole.EDITOR}>{RoleDescriptions[UserRole.EDITOR]}</option>
                  <option value={UserRole.VIEWER}>{RoleDescriptions[UserRole.VIEWER]}</option>
                  {user?.role === UserRole.OWNER && (
                    <option value={UserRole.ADMIN}>{RoleDescriptions[UserRole.ADMIN]}</option>
                  )}
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowInviteModal(false)}>
                  取消
                </button>
                <button type="submit" disabled={submitting}>
                  {submitting ? '邀请中...' : '发送邀请'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 角色编辑模态框 */}
      {showRoleModal && selectedMember && (
        <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>编辑角色 - {selectedMember.username}</h2>
            <div className="role-options">
              {Object.values(UserRole).filter(r => r !== UserRole.OWNER).map((role) => (
                <div
                  key={role}
                  className={`role-option ${selectedMember.role === role ? 'selected' : ''}`}
                  onClick={() => handleUpdateRole(role)}
                >
                  <span className="role-icon">{RoleIcons[role]}</span>
                  <span className="role-name">{RoleDescriptions[role]}</span>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowRoleModal(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 权限编辑模态框 */}
      {showPermissionsModal && selectedMember && (
        <div className="modal-overlay" onClick={() => setShowPermissionsModal(false)}>
          <div className="modal-content permissions-modal" onClick={(e) => e.stopPropagation()}>
            <h2>自定义权限 - {selectedMember.username}</h2>
            <form onSubmit={handleUpdatePermissions}>
              {Object.keys(customPermissions).map((resource) => (
                <div key={resource} className="permission-group">
                  <h3>{resource === 'albums' ? '相册' : resource === 'files' ? '文件' : resource === 'articles' ? '文章' : '成员'}</h3>
                  <div className="permission-checkboxes">
                    {['read', 'write', 'delete'].map((action) => (
                      <label key={action}>
                        <input
                          type="checkbox"
                          checked={customPermissions[resource as keyof typeof customPermissions][action as 'read']}
                          onChange={(e) => {
                            setCustomPermissions({
                              ...customPermissions,
                              [resource]: {
                                ...customPermissions[resource as keyof typeof customPermissions],
                                [action]: e.target.checked,
                              },
                            });
                          }}
                        />
                        {action === 'read' ? '读取' : action === 'write' ? '写入' : '删除'}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div className="modal-actions">
                <button type="button" onClick={() => setShowPermissionsModal(false)}>
                  取消
                </button>
                <button type="submit" disabled={submitting}>
                  {submitting ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyMembers;

