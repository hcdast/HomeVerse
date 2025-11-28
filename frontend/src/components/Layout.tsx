import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useEffect, useState } from 'react';
import NotificationBell from './NotificationBell';
import SearchBar from './SearchBar';
import Sidebar from './Sidebar';
import './Layout.css';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // 如果未认证，重定向到登录页
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const navItems = [
    { path: '/', label: '首页', icon: '🏠' },
    { path: '/calendar', label: '日历', icon: '📅' },
    { path: '/todos', label: '待办', icon: '✅' },
    { path: '/finance', label: '记账', icon: '💰' },
    { path: '/albums', label: '相册', icon: '📷' },
    { path: '/files', label: '文件', icon: '📁' },
    { path: '/articles', label: '文章', icon: '📝' },
    { path: '/recipes', label: '食谱', icon: '🍳' },
    { path: '/wiki', label: '知识库', icon: '📚' },
    { path: '/health', label: '健康', icon: '🏥' },
    { path: '/growth', label: '成长', icon: '👶' },
    { path: '/passwords', label: '密码', icon: '🔐' },
    { path: '/family-members', label: '成员', icon: '👥' },
  ];

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <button 
              className="sidebar-toggle"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title="切换侧边栏"
            >
              ☰
            </button>
            <h1 className="logo">HomeVerse</h1>
          </div>
          
          <div className="header-right">
            <div className="search-container">
              <SearchBar placeholder="搜索..." />
            </div>
            <NotificationBell />
            <div className="user-info">
              <span className="user-welcome">Hi, {user?.username}</span>
              <button onClick={logout} className="logout-btn">
                退出
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="layout-body">
        {!sidebarCollapsed && <Sidebar />}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

