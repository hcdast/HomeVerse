import { useState, useEffect } from 'react';
import api from '@/services/api';
import './Wiki.css';

const Wiki = () => {
  const [pages, setPages] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: '',
  });

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      const response = await api.get('/wiki');
      const data = Array.isArray(response.data) ? response.data : [];
      setPages(data);
    } catch (error) {
      console.error('加载失败:', error);
      setPages([]);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/wiki', {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      });
      setShowCreateModal(false);
      setFormData({
        title: '',
        content: '',
        category: '',
        tags: '',
      });
      loadPages();
    } catch (error: any) {
      alert(error.response?.data?.message || '创建失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此页面？')) return;
    try {
      await api.delete(`/wiki/${id}`);
      loadPages();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  return (
    <div className="wiki-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📚 家庭知识库</h1>
          <p className="page-subtitle">记录和整理家庭知识</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + 新建页面
        </button>
      </div>

      <div className="wiki-container card">
        {pages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <p>暂无知识页面，开始构建家庭知识库吧！</p>
          </div>
        ) : (
          <div className="wiki-pages-list">
            {pages.map((page) => (
              <div key={page._id} className="wiki-page-item">
                <div className="page-icon">📄</div>
                <div className="page-content">
                  <div className="page-title-line">{page.title}</div>
                  {page.category && (
                    <span className="page-category">{page.category}</span>
                  )}
                  <div className="page-meta">
                    <span>👁️ {page.views || 0} 次浏览</span>
                    <span>📅 {new Date(page.updatedAt).toLocaleDateString('zh-CN')}</span>
                    <span>✍️ {page.lastEditedBy?.username || page.createdBy?.username}</span>
                  </div>
                  {page.tags && page.tags.length > 0 && (
                    <div className="page-tags">
                      {page.tags.map((tag, index) => (
                        <span key={index} className="tag">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button className="delete-btn" onClick={() => handleDelete(page._id)}>
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h2>新建知识页面</h2>
            <div className="form-group">
              <label>页面标题</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="输入页面标题"
              />
            </div>
            <div className="form-group">
              <label>分类</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="例如：家电说明、生活技巧"
              />
            </div>
            <div className="form-group">
              <label>内容（支持Markdown）</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="输入页面内容，支持Markdown格式"
                rows={10}
              />
            </div>
            <div className="form-group">
              <label>标签（用逗号分隔）</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="例如：家电, 维修, 保养"
              />
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button type="submit" onClick={handleCreate}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wiki;

