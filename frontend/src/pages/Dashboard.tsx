import { useEffect, useState } from 'react';
import api from '@/services/api';
import Loading from '@/components/Loading';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    albums: 0,
    files: 0,
    articles: 0,
    storageUsed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [albumsRes, filesRes, articlesRes, storageRes] = await Promise.all([
        api.get('/albums'),
        api.get('/files'),
        api.get('/articles'),
        api.get('/files/storage-usage'),
      ]);

      setStats({
        albums: albumsRes.data.length,
        files: filesRes.data.length,
        articles: articlesRes.data.length,
        storageUsed: storageRes.data.used || 0,
      });
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">欢迎回来！</h1>
        <p className="dashboard-subtitle">管理您的家庭数字资产</p>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📷</div>
          <div className="stat-content">
            <div className="stat-value">{stats.albums}</div>
            <div className="stat-label">相册</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📁</div>
          <div className="stat-content">
            <div className="stat-value">{stats.files}</div>
            <div className="stat-label">文件</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <div className="stat-value">{stats.articles}</div>
            <div className="stat-label">文章</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💾</div>
          <div className="stat-content">
            <div className="stat-value">{formatBytes(stats.storageUsed)}</div>
            <div className="stat-label">存储使用</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

