import { useState, useEffect } from 'react';
import api from '../services/api';
import './Templates.css';

interface Template {
  _id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  isSystem: boolean;
  usageCount: number;
  content: any;
  tags: string[];
  createdAt: string;
}

const categoryLabels: Record<string, string> = {
  shopping: '购物清单',
  recipe: '食谱',
  chore: '家务',
  todo: '待办任务',
  calendar: '日历事件',
  budget: '预算规划',
  travel: '旅行计划',
  custom: '自定义',
};

const Templates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [activeCategory]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const params = activeCategory !== 'all' ? `?category=${activeCategory}` : '';
      const response = await api.get(`/templates${params}`);
      setTemplates(response.data || []);
    } catch (error) {
      console.error('加载模板失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (template: Template) => {
    try {
      await api.post(`/templates/${template._id}/use`);
      setSelectedTemplate(template);
    } catch (error) {
      console.error('使用模板失败:', error);
    }
  };

  const handleCopyTemplate = async (template: Template) => {
    try {
      const newName = prompt('请输入新模板名称:', `${template.name} (副本)`);
      if (!newName) return;
      await api.post(`/templates/${template._id}/copy`, { name: newName });
      loadTemplates();
      alert('模板复制成功');
    } catch (error) {
      console.error('复制模板失败:', error);
    }
  };

  const handleDeleteTemplate = async (template: Template) => {
    if (!confirm(`确定要删除模板 "${template.name}" 吗？`)) return;
    try {
      await api.delete(`/templates/${template._id}`);
      loadTemplates();
    } catch (error: any) {
      alert(error.response?.data?.message || '删除失败');
    }
  };

  const categories = ['all', 'shopping', 'chore', 'todo', 'budget', 'travel'];

  return (
    <div className="templates-page">
      <div className="page-header">
        <div className="header-content">
          <h1>📋 模板中心</h1>
          <p>使用预设模板快速创建内容</p>
        </div>
        <button className="create-btn" onClick={() => setShowCreateModal(true)}>
          ➕ 创建模板
        </button>
      </div>

      {/* 分类标签 */}
      <div className="category-tabs">
        {categories.map(cat => (
          <button
            key={cat}
            className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat === 'all' ? '全部' : categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* 模板列表 */}
      {loading ? (
        <div className="loading">加载中...</div>
      ) : templates.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <p>暂无模板</p>
        </div>
      ) : (
        <div className="templates-grid">
          {templates.map(template => (
            <div
              key={template._id}
              className="template-card"
              style={{ '--template-color': template.color || '#667eea' } as any}
            >
              <div className="template-header">
                <span className="template-icon">{template.icon || '📄'}</span>
                <div className="template-badges">
                  {template.isSystem && <span className="badge system">系统</span>}
                  <span className="badge category">{categoryLabels[template.category]}</span>
                </div>
              </div>
              <h3 className="template-name">{template.name}</h3>
              <p className="template-desc">{template.description || '暂无描述'}</p>
              <div className="template-meta">
                <span className="usage-count">使用 {template.usageCount} 次</span>
              </div>
              <div className="template-actions">
                <button className="action-btn primary" onClick={() => handleUseTemplate(template)}>
                  使用
                </button>
                <button className="action-btn" onClick={() => handleCopyTemplate(template)}>
                  复制
                </button>
                {!template.isSystem && (
                  <button className="action-btn danger" onClick={() => handleDeleteTemplate(template)}>
                    删除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 模板详情弹窗 */}
      {selectedTemplate && (
        <div className="modal-overlay" onClick={() => setSelectedTemplate(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-icon">{selectedTemplate.icon}</span>
              <h2>{selectedTemplate.name}</h2>
              <button className="close-btn" onClick={() => setSelectedTemplate(null)}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">{selectedTemplate.description}</p>
              <div className="template-content-preview">
                <h4>模板内容预览</h4>
                <pre>{JSON.stringify(selectedTemplate.content, null, 2)}</pre>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn secondary" onClick={() => setSelectedTemplate(null)}>
                关闭
              </button>
              <button className="btn primary">
                应用模板
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templates;



