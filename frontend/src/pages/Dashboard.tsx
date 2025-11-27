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
    {
      title: '创建相册',
      icon: '📷',
      description: '上传和管理家庭照片',
      path: '/albums',
      permission: { resource: Resource.ALBUMS, action: Action.WRITE },
    },
    {
      title: '上传文件',
      icon: '📁',
      description: '存储重要文件',
      path: '/files',
      permission: { resource: Resource.FILES, action: Action.WRITE },
    },
    {
      title: '写文章',
      icon: '📝',
      description: '记录生活点滴',
      path: '/articles',
      permission: { resource: Resource.ARTICLES, action: Action.WRITE },
    },
    {
      title: '管理成员',
      icon: '👥',
      description: '邀请和管理家庭成员',
      path: '/family-members',
      permission: { resource: Resource.MEMBERS, action: Action.READ },
    },
    {
      title: 'AI 助手',
      icon: '🤖',
      description: 'AI 辅助创作',
      path: '/ai-settings',
      permission: null,
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

      {/* 快捷操作 */}
      <div className="quick-actions-section">
        <h2>快捷操作</h2>
        <div className="quick-actions-grid">
          {quickActions.map((action) => {
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
