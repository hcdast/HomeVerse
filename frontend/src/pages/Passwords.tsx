import { useState, useEffect } from 'react';
import api from '@/services/api';
import './Passwords.css';

const Passwords = () => {
  const [passwords, setPasswords] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<{ id: string; password: string } | null>(null);
  const [formData, setFormData] = useState({
    serviceName: '',
    username: '',
    password: '',
    url: '',
    notes: '',
  });

  useEffect(() => {
    loadPasswords();
  }, []);

  const loadPasswords = async () => {
    try {
      const response = await api.get('/passwords');
      const data = Array.isArray(response.data) ? response.data : [];
      setPasswords(data);
    } catch (error) {
      console.error('加载失败:', error);
      setPasswords([]);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/passwords', formData);
      setShowCreateModal(false);
      setFormData({
        serviceName: '',
        username: '',
        password: '',
        url: '',
        notes: '',
      });
      loadPasswords();
    } catch (error: any) {
      alert(error.response?.data?.message || '创建失败');
    }
  };

  const handleReveal = async (id: string) => {
    try {
      const response = await api.get(`/passwords/${id}/reveal`);
      setRevealedPassword({ id, password: response.data.password });
      // 5秒后自动隐藏
      setTimeout(() => {
        if (revealedPassword?.id === id) {
          setRevealedPassword(null);
        }
      }, 5000);
    } catch (error: any) {
      alert(error.response?.data?.message || '查看失败');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此密码？')) return;
    try {
      await api.delete(`/passwords/${id}`);
      loadPasswords();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  return (
    <div className="passwords-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🔐 密码管理</h1>
          <p className="page-subtitle">安全存储家庭共享账号</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + 添加密码
        </button>
      </div>

      <div className="security-notice">
        <span className="notice-icon">🔒</span>
        <div className="notice-text">
          <strong>安全提示：</strong>所有密码采用AES-256加密存储，查看密码需要权限验证。
        </div>
      </div>

      <div className="passwords-container card">
        {passwords.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔐</div>
            <p>暂无保存的密码，添加第一个吧！</p>
          </div>
        ) : (
          <div className="passwords-list">
            {passwords.map((pwd) => (
              <div key={pwd._id} className="password-item">
                <div className="password-icon">🔑</div>
                <div className="password-content">
                  <div className="password-header">
                    <span className="service-name">{pwd.serviceName}</span>
                    {pwd.url && (
                      <a
                        href={pwd.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="service-url"
                        onClick={(e) => e.stopPropagation()}
                      >
                        🔗
                      </a>
                    )}
                  </div>
                  <div className="password-username">👤 {pwd.username}</div>
                  <div className="password-field">
                    {revealedPassword?.id === pwd._id && revealedPassword ? (
                      <div className="revealed-password">
                        <span className="password-text">{revealedPassword.password}</span>
                        <button
                          className="copy-btn"
                          onClick={() => handleCopy(revealedPassword.password)}
                        >
                          📋 复制
                        </button>
                      </div>
                    ) : (
                      <div className="hidden-password">
                        <span className="password-dots">••••••••</span>
                        <button
                          className="reveal-btn"
                          onClick={() => handleReveal(pwd._id)}
                        >
                          👁️ 查看
                        </button>
                      </div>
                    )}
                  </div>
                  {pwd.notes && (
                    <div className="password-notes">📝 {pwd.notes}</div>
                  )}
                  {pwd.lastUsed && (
                    <div className="last-used">
                      上次使用：{new Date(pwd.lastUsed).toLocaleDateString('zh-CN')}
                    </div>
                  )}
                </div>
                <button className="delete-btn" onClick={() => handleDelete(pwd._id)}>
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
            <h2>添加密码</h2>
            <div className="form-group">
              <label>服务名称</label>
              <input
                type="text"
                value={formData.serviceName}
                onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                placeholder="例如：Netflix、WiFi"
              />
            </div>
            <div className="form-group">
              <label>用户名/账号</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="登录用户名或邮箱"
              />
            </div>
            <div className="form-group">
              <label>密码</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="输入密码（将加密存储）"
              />
            </div>
            <div className="form-group">
              <label>网址（可选）</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            <div className="form-group">
              <label>备注</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="额外说明"
                rows={2}
              />
            </div>
            <div className="security-tip">
              🔒 密码将使用AES-256加密存储，只有您和共享的成员可以查看
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

export default Passwords;

