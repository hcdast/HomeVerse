import { useState, useEffect } from 'react';
import api from '../services/api';
import './Favorites.css';

interface Favorite {
  _id: string;
  type: string;
  title: string;
  description?: string;
  thumbnail?: string;
  url?: string;
  tags: string[];
  notes?: string;
  isPinned: boolean;
  collections: { _id: string; name: string; color?: string }[];
  createdAt: string;
}

interface Collection {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  itemCount: number;
  isPrivate: boolean;
}

interface Statistics {
  totalFavorites: number;
  totalCollections: number;
  byType: { type: string; count: number }[];
}

const typeLabels: Record<string, string> = {
  article: '文章',
  recipe: '食谱',
  file: '文件',
  album: '相册',
  wiki: '知识库',
  link: '链接',
  note: '笔记',
};

const typeIcons: Record<string, string> = {
  article: '📄',
  recipe: '🍳',
  file: '📁',
  album: '📷',
  wiki: '📖',
  link: '🔗',
  note: '📝',
};

const Favorites = () => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [newCollection, setNewCollection] = useState({ name: '', description: '', color: '' });

  useEffect(() => {
    loadCollections();
    loadStatistics();
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [activeCollection, activeType, searchQuery]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeCollection) params.set('collectionId', activeCollection);
      if (activeType) params.set('type', activeType);
      if (searchQuery) params.set('search', searchQuery);

      const res = await api.get(`/favorites?${params.toString()}`);
      setFavorites(res.data.favorites);
    } catch (err) {
      console.error('加载收藏失败', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCollections = async () => {
    try {
      const res = await api.get('/favorites/collections');
      setCollections(res.data);
    } catch (err) {
      console.error('加载收藏夹失败', err);
    }
  };

  const loadStatistics = async () => {
    try {
      const res = await api.get('/favorites/statistics');
      setStatistics(res.data);
    } catch (err) {
      console.error('加载统计失败', err);
    }
  };

  const handleTogglePin = async (favoriteId: string) => {
    try {
      await api.put(`/favorites/${favoriteId}/pin`);
      loadFavorites();
    } catch (err) {
      console.error('切换置顶失败', err);
    }
  };

  const handleRemoveFavorite = async (type: string, itemId: string) => {
    try {
      await api.delete(`/favorites/${type}/${itemId}`);
      loadFavorites();
      loadStatistics();
    } catch (err) {
      console.error('删除收藏失败', err);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollection.name) {
      alert('请输入收藏夹名称');
      return;
    }

    try {
      await api.post('/favorites/collections', newCollection);
      setShowCreateCollectionModal(false);
      setNewCollection({ name: '', description: '', color: '' });
      loadCollections();
      loadStatistics();
    } catch (err) {
      console.error('创建收藏夹失败', err);
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
    if (!confirm('确定要删除这个收藏夹吗？')) return;

    try {
      await api.delete(`/favorites/collections/${collectionId}`);
      if (activeCollection === collectionId) {
        setActiveCollection(null);
      }
      loadCollections();
    } catch (err) {
      console.error('删除收藏夹失败', err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
  ];

  return (
    <div className="favorites-page">
      <div className="page-header">
        <div className="header-content">
          <h1>⭐ 我的收藏</h1>
          <p>一键收藏，随时查阅</p>
        </div>
        <button className="btn-create" onClick={() => setShowCreateCollectionModal(true)}>
          📁 新建收藏夹
        </button>
      </div>

      {statistics && (
        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-value">{statistics.totalFavorites}</span>
            <span className="stat-label">收藏总数</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{statistics.totalCollections}</span>
            <span className="stat-label">收藏夹</span>
          </div>
          {statistics.byType.map((item) => (
            <div key={item.type} className="stat-item">
              <span className="stat-value">{item.count}</span>
              <span className="stat-label">{typeLabels[item.type] || item.type}</span>
            </div>
          ))}
        </div>
      )}

      <div className="favorites-layout">
        <aside className="favorites-sidebar">
          <div className="sidebar-section">
            <h3>收藏夹</h3>
            <ul className="collection-list">
              <li
                className={`collection-item ${activeCollection === null ? 'active' : ''}`}
                onClick={() => setActiveCollection(null)}
              >
                <span className="collection-icon">📚</span>
                <span className="collection-name">全部收藏</span>
              </li>
              {collections.map((collection) => (
                <li
                  key={collection._id}
                  className={`collection-item ${activeCollection === collection._id ? 'active' : ''}`}
                  onClick={() => setActiveCollection(collection._id)}
                >
                  <span
                    className="collection-icon"
                    style={{ backgroundColor: collection.color || '#3b82f6' }}
                  >
                    {collection.icon || '📁'}
                  </span>
                  <span className="collection-name">{collection.name}</span>
                  <span className="collection-count">{collection.itemCount}</span>
                  <button
                    className="collection-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCollection(collection._id);
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="sidebar-section">
            <h3>类型筛选</h3>
            <ul className="type-list">
              <li
                className={`type-item ${activeType === null ? 'active' : ''}`}
                onClick={() => setActiveType(null)}
              >
                全部类型
              </li>
              {Object.entries(typeLabels).map(([type, label]) => (
                <li
                  key={type}
                  className={`type-item ${activeType === type ? 'active' : ''}`}
                  onClick={() => setActiveType(type)}
                >
                  {typeIcons[type]} {label}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="favorites-main">
          <div className="search-bar">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索收藏..."
            />
          </div>

          {loading ? (
            <div className="loading">加载中...</div>
          ) : (
            <div className="favorites-grid">
              {favorites.length === 0 ? (
                <div className="empty">暂无收藏</div>
              ) : (
                favorites.map((favorite) => (
                  <div key={favorite._id} className={`favorite-card ${favorite.isPinned ? 'pinned' : ''}`}>
                    {favorite.thumbnail && (
                      <div
                        className="favorite-thumbnail"
                        style={{ backgroundImage: `url(${favorite.thumbnail})` }}
                      />
                    )}
                    <div className="favorite-content">
                      <div className="favorite-header">
                        <span className="favorite-type">
                          {typeIcons[favorite.type]} {typeLabels[favorite.type]}
                        </span>
                        {favorite.isPinned && <span className="pin-badge">📌</span>}
                      </div>
                      <h3 className="favorite-title">{favorite.title}</h3>
                      {favorite.description && (
                        <p className="favorite-description">{favorite.description}</p>
                      )}
                      {favorite.notes && (
                        <p className="favorite-notes">💭 {favorite.notes}</p>
                      )}
                      {favorite.tags.length > 0 && (
                        <div className="favorite-tags">
                          {favorite.tags.map((tag, i) => (
                            <span key={i} className="tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="favorite-footer">
                        <span className="favorite-date">{formatDate(favorite.createdAt)}</span>
                        <div className="favorite-actions">
                          <button
                            className="action-btn"
                            onClick={() => handleTogglePin(favorite._id)}
                            title={favorite.isPinned ? '取消置顶' : '置顶'}
                          >
                            📌
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={() => handleRemoveFavorite(favorite.type, favorite._id)}
                            title="删除"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>

      {showCreateCollectionModal && (
        <div className="modal-overlay" onClick={() => setShowCreateCollectionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>新建收藏夹</h2>

            <div className="form-group">
              <label>名称</label>
              <input
                type="text"
                value={newCollection.name}
                onChange={(e) => setNewCollection((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="输入收藏夹名称"
              />
            </div>

            <div className="form-group">
              <label>描述（可选）</label>
              <input
                type="text"
                value={newCollection.description}
                onChange={(e) =>
                  setNewCollection((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="添加描述"
              />
            </div>

            <div className="form-group">
              <label>颜色</label>
              <div className="color-picker">
                {colors.map((color) => (
                  <button
                    key={color}
                    className={`color-option ${newCollection.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewCollection((prev) => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowCreateCollectionModal(false)}>
                取消
              </button>
              <button className="btn-confirm" onClick={handleCreateCollection}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Favorites;
