import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 如果已登录，重定向到首页
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.identifier, formData.password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败，请检查用户名/邮箱和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">🏠</div>
        <h1 className="auth-title">登录 HomeVerse</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>用户名 / 邮箱</label>
            <input
              type="text"
              value={formData.identifier}
              onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
              required
              placeholder="请输入用户名或邮箱"
            />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              placeholder="请输入密码"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        <div className="auth-footer">
          还没有账号？ <Link to="/register">立即注册</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;

