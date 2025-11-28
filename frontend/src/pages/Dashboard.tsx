import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePermissions, Resource, Action } from '../hooks/usePermissions';
import { RoleIcons, RoleDescriptions } from '../services/familyService';
import api from '../services/api';
import './Dashboard.css';

interface Stats {
  albums: number;
  files: number;
  articles: number;
  members: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { hasPermission, userRole } = usePermissions();
  const [stats, setStats] = useState<Stats>({ albums: 0, files: 0, articles: 0, members: 0 });
  // const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // 获取各模块的数据统计
      const [albums, files, articles] = await Promise.all([
        hasPermission(Resource.ALBUMS, Action.READ) ? api.get('/albums').catch(() => ({ data: [] })) : { data: [] },
        hasPermission(Resource.FILES, Action.READ) ? api.get('/files').catch(() => ({ data: [] })) : { data: [] },
        hasPermission(Resource.ARTICLES, Action.READ) ? api.get('/articles').catch(() => ({ data: [] })) : { data: [] },
      ]);

      let memberCount = 0;
      if (user?.familyId && hasPermission(Resource.MEMBERS, Action.READ)) {
        try {
          const membersRes = await api.get(`/families/${user.familyId}/members`);
          memberCount = membersRes.data.length;
        } catch (err) {
          console.error('获取成员数失败:', err);
        }
      }

      setStats({
        albums: albums.data.length || 0,
        files: files.data.length || 0,
        articles: articles.data.length || 0,
        members: memberCount,
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  const quickActions = [
    // 核心功能
    {
      title: '家庭日历',
      icon: '📅',
      description: '管理重要日程和事件',
      path: '/calendar',
      permission: null,
      category: '核心功能',
    },
    {
      title: '待办清单',
      icon: '✅',
      description: '追踪家庭任务',
      path: '/todos',
      permission: null,
      category: '核心功能',
    },
    {
      title: '财务记账',
      icon: '💰',
      description: '管理收支，掌握财务',
      path: '/finance',
      permission: null,
      category: '核心功能',
    },
    // 资料管理
    {
      title: '家庭相册',
      icon: '📷',
      description: '珍藏美好回忆',
      path: '/albums',
      permission: { resource: Resource.ALBUMS, action: Action.READ },
      category: '资料管理',
    },
    {
      title: '文件管理',
      icon: '📁',
      description: '安全存储文件',
      path: '/files',
      permission: { resource: Resource.FILES, action: Action.READ },
      category: '资料管理',
    },
    {
      title: '文章管理',
      icon: '📝',
      description: '记录生活点滴',
      path: '/articles',
      permission: { resource: Resource.ARTICLES, action: Action.READ },
      category: '资料管理',
    },
    // 生活助手
    {
      title: '家庭食谱',
      icon: '🍳',
      description: '收藏美味佳肴',
      path: '/recipes',
      permission: null,
      category: '生活助手',
    },
    {
      title: '健康档案',
      icon: '🏥',
      description: '管理健康信息',
      path: '/health',
      permission: null,
      category: '生活助手',
    },
    {
      title: '成长记录',
      icon: '👶',
      description: '记录成长轨迹',
      path: '/growth',
      permission: null,
      category: '生活助手',
    },
    // 工具
    {
      title: '知识库',
      icon: '📚',
      description: '整理家庭知识',
      path: '/wiki',
      permission: null,
      category: '工具',
    },
    {
      title: '密码管理',
      icon: '🔐',
      description: '安全存储密码',
      path: '/passwords',
      permission: null,
      category: '工具',
    },
    {
      title: 'AI 助手',
      icon: '🤖',
      description: 'AI 辅助创作',
      path: '/ai-settings',
      permission: null,
      category: '工具',
    },
  ];

  return (
    <div className="dashboard-page">
      <div className="welcome-section">
        <div className="welcome-content">
          <h1>欢迎回来, {user?.username}! 👋</h1>
          <div className="user-role-badge">
            <span className="role-icon">{RoleIcons[userRole]}</span>
            <span className="role-text">{RoleDescriptions[userRole]}</span>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📷</div>
          <div className="stat-info">
            <div className="stat-number">{stats.albums}</div>
            <div className="stat-label">相册</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📁</div>
          <div className="stat-info">
            <div className="stat-number">{stats.files}</div>
            <div className="stat-label">文件</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-info">
            <div className="stat-number">{stats.articles}</div>
            <div className="stat-label">文章</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <div className="stat-number">{stats.members}</div>
            <div className="stat-label">成员</div>
          </div>
        </div>
      </div>

      {/* 功能模块 */}
      <div className="modules-section">
        <h2>功能模块</h2>
        
        {/* 按分类显示 */}
        {['核心功能', '资料管理', '生活助手', '工具'].map(category => {
          const categoryActions = quickActions.filter(action => action.category === category);
          if (categoryActions.length === 0) return null;
          
          return (
            <div key={category} className="module-category">
              <h3 className="category-name">{category}</h3>
              <div className="quick-actions-grid">
                {categoryActions.map((action) => {
                  // 检查权限
                  const hasAccess = !action.permission || 
                    hasPermission(action.permission.resource, action.permission.action);
                  
                  if (!hasAccess) return null;

                  return (
                    <div
                      key={action.path}
                      className="quick-action-card"
                      onClick={() => navigate(action.path)}
                    >
                      <div className="action-icon">{action.icon}</div>
                      <div className="action-content">
                        <h3>{action.title}</h3>
                        <p>{action.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 权限说明 */}
      <div className="permissions-info">
        <h3>您当前的权限</h3>
        <div className="permissions-grid">
          <div className="permission-item">
            <span className="permission-icon">📷</span>
            <span>相册</span>
            <div className="permission-badges">
              {hasPermission(Resource.ALBUMS, Action.READ) && <span className="badge badge-read">读取</span>}
              {hasPermission(Resource.ALBUMS, Action.WRITE) && <span className="badge badge-write">写入</span>}
              {hasPermission(Resource.ALBUMS, Action.DELETE) && <span className="badge badge-delete">删除</span>}
            </div>
          </div>

          <div className="permission-item">
            <span className="permission-icon">📁</span>
            <span>文件</span>
            <div className="permission-badges">
              {hasPermission(Resource.FILES, Action.READ) && <span className="badge badge-read">读取</span>}
              {hasPermission(Resource.FILES, Action.WRITE) && <span className="badge badge-write">写入</span>}
              {hasPermission(Resource.FILES, Action.DELETE) && <span className="badge badge-delete">删除</span>}
            </div>
          </div>

          <div className="permission-item">
            <span className="permission-icon">📝</span>
            <span>文章</span>
            <div className="permission-badges">
              {hasPermission(Resource.ARTICLES, Action.READ) && <span className="badge badge-read">读取</span>}
              {hasPermission(Resource.ARTICLES, Action.WRITE) && <span className="badge badge-write">写入</span>}
              {hasPermission(Resource.ARTICLES, Action.DELETE) && <span className="badge badge-delete">删除</span>}
            </div>
          </div>

          <div className="permission-item">
            <span className="permission-icon">👥</span>
            <span>成员</span>
            <div className="permission-badges">
              {hasPermission(Resource.MEMBERS, Action.READ) && <span className="badge badge-read">读取</span>}
              {hasPermission(Resource.MEMBERS, Action.WRITE) && <span className="badge badge-write">写入</span>}
              {hasPermission(Resource.MEMBERS, Action.DELETE) && <span className="badge badge-delete">删除</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
