import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useEffect } from 'react';
import NotificationBell from './NotificationBell';
import SearchBar from './SearchBar';
import './Layout.css';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // 如果未认证，重定向到登录页
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const navItems = [
    { path: '/', label: '首页', icon: '🏠' },
    { path: '/albums', label: '相册', icon: '📷' },
    { path: '/files', label: '文件', icon: '📁' },
    { path: '/articles', label: '文章', icon: '📝' },
    { path: '/family-members', label: '成员', icon: '👥' },
    { path: '/ai-settings', label: 'AI设置', icon: '🤖' },
    { path: '/profile', label: '个人', icon: '👤' },
  ];

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">HomeVerse</h1>
          <nav className="nav">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="header-right">
            <div className="search-container">
              <SearchBar placeholder="搜索..." />
            </div>
            <NotificationBell />
            <div className="user-info">
              <span>欢迎, {user?.username}</span>
              <button onClick={logout} className="logout-btn">
                退出
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

