import { useEffect, useState } from 'react';
import api from '@/services/api';
import Loading from '@/components/Loading';
import RichTextEditor from '@/components/RichTextEditor';
import AiProviderSelector from '@/components/AiProviderSelector';
import aiService, { AiProviderType } from '@/services/aiService';
import './Articles.css';

interface Article {
  _id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  views: number;
  likes: string[];
  status: string;
  createdAt: string;
}

const Articles = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [newArticle, setNewArticle] = useState({
    title: '',
    content: '',
    excerpt: '',
    status: 'draft',
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [selectedAiProvider, setSelectedAiProvider] = useState<AiProviderType | undefined>();
  // const [showProviderSelector, setShowProviderSelector] = useState(false);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await api.get('/articles');
      setArticles(response.data);
    } catch (error) {
      console.error('获取文章失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/articles', newArticle);
      setShowCreateModal(false);
      setNewArticle({ title: '', content: '', excerpt: '', status: 'draft' });
      fetchArticles();
    } catch (error) {
      console.error('创建文章失败:', error);
      alert('创建文章失败，请重试');
    }
  };

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article);
    setNewArticle({
      title: article.title,
      content: article.content,
      excerpt: article.excerpt,
      status: article.status,
    });
    setShowEditModal(true);
  };

  const handleUpdateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle) return;

    try {
      await api.put(`/articles/${editingArticle._id}`, newArticle);
      setShowEditModal(false);
      setEditingArticle(null);
      setNewArticle({ title: '', content: '', excerpt: '', status: 'draft' });
      fetchArticles();
    } catch (error) {
      console.error('更新文章失败:', error);
      alert('更新文章失败，请重试');
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!confirm('确定要删除这篇文章吗？')) return;

    try {
      await api.delete(`/articles/${id}`);
      fetchArticles();
    } catch (error) {
      console.error('删除文章失败:', error);
      alert('删除文章失败，请重试');
    }
  };

  // AI 生成文章内容
  const handleAiGenerateContent = async () => {
    if (!aiPrompt.trim()) {
      alert('请输入生成提示词');
      return;
    }

    setAiLoading(true);
    try {
      const content = await aiService.generateContent(aiPrompt, {
        maxTokens: 2000,
        temperature: 0.7,
        provider: selectedAiProvider,
      });
      setNewArticle({
        ...newArticle,
        content: content,
      });
      setAiPrompt('');
      setShowAiPanel(false);
    } catch (error: any) {
      console.error('AI 生成失败:', error);
      alert(error.response?.data?.message || 'AI 生成失败，请检查配置');
    } finally {
      setAiLoading(false);
    }
  };

  // AI 生成标题
  const handleAiGenerateTitle = async () => {
    if (!newArticle.content.trim()) {
      alert('请先输入文章内容');
      return;
    }

    setAiLoading(true);
    try {
      const topic = newArticle.content.substring(0, 200);
      const title = await aiService.generateTitle(topic, selectedAiProvider);
      setNewArticle({
        ...newArticle,
        title: title,
      });
    } catch (error: any) {
      console.error('AI 生成标题失败:', error);
      alert(error.response?.data?.message || 'AI 生成标题失败');
    } finally {
      setAiLoading(false);
    }
  };

  // AI 生成摘要
  const handleAiGenerateExcerpt = async () => {
    if (!newArticle.content.trim()) {
      alert('请先输入文章内容');
      return;
    }

    setAiLoading(true);
    try {
      const excerpt = await aiService.generateExcerpt(newArticle.content, selectedAiProvider);
      setNewArticle({
        ...newArticle,
        excerpt: excerpt,
      });
    } catch (error: any) {
      console.error('AI 生成摘要失败:', error);
      alert(error.response?.data?.message || 'AI 生成摘要失败');
    } finally {
      setAiLoading(false);
    }
  };

  // AI 优化内容
  const handleAiOptimizeContent = async () => {
    if (!newArticle.content.trim()) {
      alert('请先输入文章内容');
      return;
    }

    setAiLoading(true);
    try {
      const content = await aiService.optimizeContent(newArticle.content, undefined, selectedAiProvider);
      setNewArticle({
        ...newArticle,
        content: content,
      });
    } catch (error: any) {
      console.error('AI 优化失败:', error);
      alert(error.response?.data?.message || 'AI 优化失败');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="articles-page">
      <div className="page-header">
        <div>
          <h1>文章管理</h1>
          <p className="page-subtitle">记录生活，分享故事</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="create-btn">
          + 创建文章
        </button>
      </div>

      {/* 创建文章模态框 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content article-editor-modal" onClick={(e) => e.stopPropagation()}>
            <h2>创建文章</h2>
            <form onSubmit={handleCreateArticle}>
              <div className="article-title-section">
                <input
                  type="text"
                  placeholder="文章标题"
                  value={newArticle.title}
                  onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="ai-btn"
                  onClick={handleAiGenerateTitle}
                  disabled={aiLoading || !newArticle.content.trim()}
                  title="AI 生成标题"
                >
                  ✨ AI标题
                </button>
              </div>

              <div className="article-excerpt-section">
                <textarea
                  placeholder="文章摘要（可选）"
                  value={newArticle.excerpt}
                  onChange={(e) => setNewArticle({ ...newArticle, excerpt: e.target.value })}
                  rows={3}
                />
                <button
                  type="button"
                  className="ai-btn"
                  onClick={handleAiGenerateExcerpt}
                  disabled={aiLoading || !newArticle.content.trim()}
                  title="AI 生成摘要"
                >
                  ✨ AI摘要
                </button>
              </div>

              <div className="article-content-section">
                <div className="content-toolbar">
                  <span>文章内容</span>
                  <div className="ai-toolbar">
                    <button
                      type="button"
                      className="ai-btn"
                      onClick={() => setShowAiPanel(!showAiPanel)}
                    >
                      🤖 AI助手
                    </button>
                    <button
                      type="button"
                      className="ai-btn"
                      onClick={handleAiOptimizeContent}
                      disabled={aiLoading || !newArticle.content.trim()}
                      title="AI 优化内容"
                    >
                      ✨ 优化
                    </button>
                  </div>
                </div>

                {showAiPanel && (
                  <div className="ai-panel">
                    <div className="ai-provider-section">
                      <label>选择 AI 模型：</label>
                      <div className="provider-selector-compact">
                        <AiProviderSelector
                          value={selectedAiProvider}
                          onChange={setSelectedAiProvider}
                          showOnlyConfigured={true}
                          compact={true}
                        />
                      </div>
                    </div>
                    <textarea
                      placeholder="输入提示词，让 AI 帮你生成文章内容..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      rows={3}
                    />
                    <button
                      type="button"
                      onClick={handleAiGenerateContent}
                      disabled={aiLoading || !aiPrompt.trim()}
                      className="ai-generate-btn"
                    >
                      {aiLoading ? '生成中...' : '生成内容'}
                    </button>
                  </div>
                )}

                <RichTextEditor
                  value={newArticle.content}
                  onChange={(value) => setNewArticle({ ...newArticle, content: value })}
                  placeholder="请输入文章内容..."
                />
              </div>

              <select
                value={newArticle.status}
                onChange={(e) => setNewArticle({ ...newArticle, status: e.target.value })}
              >
                <option value="draft">草稿</option>
                <option value="published">已发布</option>
              </select>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)}>
                  取消
                </button>
                <button type="submit" disabled={aiLoading}>
                  {aiLoading ? '处理中...' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 编辑文章模态框 */}
      {showEditModal && editingArticle && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content article-editor-modal" onClick={(e) => e.stopPropagation()}>
            <h2>编辑文章</h2>
            <form onSubmit={handleUpdateArticle}>
              <div className="article-title-section">
                <input
                  type="text"
                  placeholder="文章标题"
                  value={newArticle.title}
                  onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="ai-btn"
                  onClick={handleAiGenerateTitle}
                  disabled={aiLoading || !newArticle.content.trim()}
                  title="AI 生成标题"
                >
                  ✨ AI标题
                </button>
              </div>

              <div className="article-excerpt-section">
                <textarea
                  placeholder="文章摘要（可选）"
                  value={newArticle.excerpt}
                  onChange={(e) => setNewArticle({ ...newArticle, excerpt: e.target.value })}
                  rows={3}
                />
                <button
                  type="button"
                  className="ai-btn"
                  onClick={handleAiGenerateExcerpt}
                  disabled={aiLoading || !newArticle.content.trim()}
                  title="AI 生成摘要"
                >
                  ✨ AI摘要
                </button>
              </div>

              <div className="article-content-section">
                <div className="content-toolbar">
                  <span>文章内容</span>
                  <div className="ai-toolbar">
                    <button
                      type="button"
                      className="ai-btn"
                      onClick={() => setShowAiPanel(!showAiPanel)}
                    >
                      🤖 AI助手
                    </button>
                    <button
                      type="button"
                      className="ai-btn"
                      onClick={handleAiOptimizeContent}
                      disabled={aiLoading || !newArticle.content.trim()}
                      title="AI 优化内容"
                    >
                      ✨ 优化
                    </button>
                  </div>
                </div>

                {showAiPanel && (
                  <div className="ai-panel">
                    <div className="ai-provider-section">
                      <label>选择 AI 模型：</label>
                      <div className="provider-selector-compact">
                        <AiProviderSelector
                          value={selectedAiProvider}
                          onChange={setSelectedAiProvider}
                          showOnlyConfigured={true}
                          compact={true}
                        />
                      </div>
                    </div>
                    <textarea
                      placeholder="输入提示词，让 AI 帮你生成文章内容..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      rows={3}
                    />
                    <button
                      type="button"
                      onClick={handleAiGenerateContent}
                      disabled={aiLoading || !aiPrompt.trim()}
                      className="ai-generate-btn"
                    >
                      {aiLoading ? '生成中...' : '生成内容'}
                    </button>
                  </div>
                )}

                <RichTextEditor
                  value={newArticle.content}
                  onChange={(value) => setNewArticle({ ...newArticle, content: value })}
                  placeholder="请输入文章内容..."
                />
              </div>

              <select
                value={newArticle.status}
                onChange={(e) => setNewArticle({ ...newArticle, status: e.target.value })}
              >
                <option value="draft">草稿</option>
                <option value="published">已发布</option>
              </select>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowEditModal(false)}>
                  取消
                </button>
                <button type="submit" disabled={aiLoading}>
                  {aiLoading ? '处理中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="articles-list">
        {articles.length === 0 ? (
          <div className="empty-state">还没有文章，创建一个吧！</div>
        ) : (
          articles.map((article) => (
            <div key={article._id} className="article-card">
              <div className="article-header">
                <h3>{article.title}</h3>
                <div className="article-actions">
                  <button
                    className="edit-btn"
                    onClick={() => handleEditArticle(article)}
                    title="编辑"
                  >
                    编辑
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteArticle(article._id)}
                    title="删除"
                  >
                    删除
                  </button>
                </div>
              </div>
              <p className="article-excerpt">
                {article.excerpt || article.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
              </p>
              <div className="article-meta">
                <span className={`status-badge ${article.status}`}>
                  {article.status === 'published' ? '已发布' : '草稿'}
                </span>
                <span>👁 {article.views}</span>
                <span>❤️ {article.likes?.length || 0}</span>
                <span>{new Date(article.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Articles;
