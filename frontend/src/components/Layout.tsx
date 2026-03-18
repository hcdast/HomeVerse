import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useEffect, useState } from 'react';
import NotificationBell from './NotificationBell';
import NotificationToast from './NotificationToast';
import SearchBar from './SearchBar';
import Sidebar from './Sidebar';
import FamilySwitcher from './FamilySwitcher';
import './Layout.css';

const Layout = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    // 如果未认证，重定向到登录页
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarVisible(false);
      } else {
        setSidebarVisible(true);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setSidebarVisible(!sidebarVisible);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <button 
              className="sidebar-toggle"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {sidebarCollapsed ? (
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round"/>
                ) : (
                  <path d="M4 6h16M4 12h10M4 18h16" strokeLinecap="round"/>
                )}
              </svg>
            </button>
            <div className="logo-wrapper">
              <span className="logo-icon">🏡</span>
              <h1 className="logo">HomeVerse</h1>
            </div>
          </div>
          
          <div className="header-right">
            <FamilySwitcher />
            <div className="search-container">
              <SearchBar placeholder="搜索..." />
            </div>
            <NotificationBell />
            <div className="user-info">
              <div className="user-avatar">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <span className="user-welcome">Hi, {user?.username}</span>
              </div>
              <button onClick={logout} className="logout-btn" title="退出登录">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="layout-body">
        {sidebarVisible && <Sidebar collapsed={sidebarCollapsed} />}
        <main className={`main-content ${!sidebarVisible ? 'full-width' : ''}`}>
          <Outlet />
        </main>
      </div>
      
      {/* 移动端遮罩 */}
      {sidebarVisible && window.innerWidth < 1024 && (
        <div className="sidebar-overlay" onClick={() => setSidebarVisible(false)} />
      )}
      
      {/* 实时通知 Toast */}
      <NotificationToast />
    </div>
  );
};

export default Layout;
