import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  
  const { register, isAuthenticated } = useAuthStore();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<any>(null);

  // 如果已登录，重定向到首页
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // 解析邀请信息
  useEffect(() => {
    if (inviteToken) {
      try {
        const decoded = JSON.parse(atob(inviteToken));
        setInviteInfo(decoded);
        // 自动填充邮箱
        if (decoded.email) {
          setFormData(prev => ({ ...prev, email: decoded.email }));
        }
      } catch (err) {
        setError('邀请链接无效或已过期');
      }
    }
  }, [inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 检查是否有邀请token
    if (!inviteToken) {
      setError('暂不支持自主注册，请通过邀请链接注册');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (formData.password.length < 6) {
      setError('密码长度至少6位');
      return;
    }

    // 验证邮箱是否匹配邀请信息
    if (inviteInfo && inviteInfo.email && formData.email !== inviteInfo.email) {
      setError(`请使用受邀邮箱注册: ${inviteInfo.email}`);
      return;
    }

    setLoading(true);

    try {
      // 注册时携带邀请token
      await register(formData.username, formData.email, formData.password, inviteToken);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 如果没有邀请token，显示提示页面
  if (!inviteToken) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">🏠</div>
          <h1 className="auth-title">欢迎来到 HomeVerse</h1>
          
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem 1rem',
            color: '#666'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔐</div>
            <h2 style={{ 
              fontSize: '1.5rem', 
              color: '#667eea', 
              marginBottom: '1rem',
              fontWeight: 600
            }}>
              邀请制注册
            </h2>
            <p style={{ 
              lineHeight: '1.8', 
              marginBottom: '1.5rem',
              fontSize: '1rem'
            }}>
              为了保证家庭成员的隐私和安全<br />
              HomeVerse 采用邀请制注册
            </p>
            
            <div style={{
              background: '#f8f9fa',
              padding: '1.5rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              textAlign: 'left'
            }}>
              <h3 style={{ 
                fontSize: '1rem', 
                marginBottom: '1rem',
                color: '#333',
                fontWeight: 600
              }}>
                💡 如何获得邀请？
              </h3>
              <ul style={{ 
                listStyle: 'none', 
                padding: 0,
                margin: 0
              }}>
                <li style={{ marginBottom: '0.5rem', paddingLeft: '1.5rem', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0 }}>1️⃣</span>
                  联系您的家人或朋友
                </li>
                <li style={{ marginBottom: '0.5rem', paddingLeft: '1.5rem', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0 }}>2️⃣</span>
                  让他们在"家庭成员"页面邀请您
                </li>
                <li style={{ marginBottom: '0.5rem', paddingLeft: '1.5rem', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0 }}>3️⃣</span>
                  查收邮箱中的邀请链接
                </li>
                <li style={{ paddingLeft: '1.5rem', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0 }}>4️⃣</span>
                  点击链接即可注册
                </li>
              </ul>
            </div>
          </div>

          <div className="auth-footer">
            已有账号？ <Link to="/login">立即登录</Link>
          </div>
        </div>
      </div>
    );
  }

  // 有邀请token，显示注册表单
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">🏠</div>
        <h1 className="auth-title">注册 HomeVerse</h1>
        
        {inviteInfo && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '1px solid rgba(102, 126, 234, 0.2)'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
              📨 您收到了家庭邀请
            </div>
            <div style={{ fontSize: '1rem', color: '#333', fontWeight: 500 }}>
              角色：{inviteInfo.role === 'member' ? '成员' : inviteInfo.role === 'admin' ? '管理员' : '访客'}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              placeholder="请输入用户名"
            />
          </div>
          <div className="form-group">
            <label>邮箱</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              readOnly={inviteInfo && inviteInfo.email}
              placeholder="请输入邮箱"
              style={inviteInfo && inviteInfo.email ? { background: '#f5f5f5' } : {}}
            />
            {inviteInfo && inviteInfo.email && (
              <div style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.25rem' }}>
                ℹ️ 请使用受邀邮箱注册
              </div>
            )}
          </div>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              placeholder="请输入密码（至少6位）"
            />
          </div>
          <div className="form-group">
            <label>确认密码</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              placeholder="请再次输入密码"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        <div className="auth-footer">
          已有账号？ <Link to="/login">立即登录</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;

