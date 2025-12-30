import { useState, useEffect } from 'react';
import api from '@/services/api';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './Recipes.css';

const Recipes = () => {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast, hideToast, error, warning } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cookingTime: '',
    difficulty: 'medium',
    ingredients: [] as any[],
    steps: [] as any[],
  });

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const response = await api.get('/recipes');
      const data = Array.isArray(response.data) ? response.data : [];
      setRecipes(data);
    } catch (error) {
      console.error('加载失败:', error);
      setRecipes([]);
    }
  };

  const handleCreate = async () => {
    // 调试：查看当前表单数据
    console.log('当前表单数据:', formData);
    console.log('菜名:', formData.name, '烹饪时间:', formData.cookingTime);
    
    // 验证必填字段
    if (!formData.name || !formData.name.trim()) {
      warning('请填写菜名');
      return;
    }
    
    if (!formData.cookingTime) {
      warning('请填写烹饪时间');
      return;
    }

    try {
      console.log('提交食谱数据:', formData);
      
      const response = await api.post('/recipes', {
        ...formData,
        cookingTime: Number(formData.cookingTime),
      });
      
      console.log('食谱创建成功:', response.data);
      
      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        cookingTime: '',
        difficulty: 'medium',
        ingredients: [],
        steps: [],
      });
      
      await loadRecipes();
      console.log('食谱列表已刷新');
    } catch (err: any) {
      console.error('创建失败:', err);
      console.error('错误详情:', err.response?.data);
      error(err.response?.data?.message || '创建失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此食谱？')) return;
    try {
      await api.delete(`/recipes/${id}`);
      loadRecipes();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleCook = async (id: string) => {
    try {
      await api.put(`/recipes/${id}/cook`);
      loadRecipes();
    } catch (error) {
      console.error('操作失败:', error);
    }
  };

  return (
    <div className="recipes-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      <div className="page-header">
        <div>
          <h1 className="page-title">🍳 家庭食谱</h1>
          <p className="page-subtitle">收藏和分享美味佳肴</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + 添加食谱
        </button>
      </div>

      <div className="recipes-grid">
        {recipes.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-icon">🍳</div>
            <p>暂无食谱，开始收藏您的拿手菜吧！</p>
          </div>
        ) : (
          recipes.map((recipe) => (
            <div key={recipe._id} className="recipe-card card">
              <div className="recipe-image">
                {recipe.photos && recipe.photos.length > 0 ? (
                  <img src={recipe.photos[0]} alt={recipe.name} />
                ) : (
                  <div className="recipe-placeholder">🍳</div>
                )}
              </div>
              <div className="recipe-content">
                <h3 className="recipe-name">{recipe.name}</h3>
                <p className="recipe-description">{recipe.description}</p>
                <div className="recipe-meta">
                  <span>⏱️ {recipe.cookingTime}分钟</span>
                  <span>
                    {recipe.difficulty === 'easy' ? '⭐ 简单' : 
                     recipe.difficulty === 'medium' ? '⭐⭐ 中等' : '⭐⭐⭐ 困难'}
                  </span>
                </div>
                <div className="recipe-stats">
                  <span>👨‍🍳 已烹饪 {recipe.cooks || 0} 次</span>
                </div>
                <div className="recipe-actions">
                  <button className="btn-cook" onClick={() => handleCook(recipe._id)}>
                    开始烹饪
                  </button>
                  <button className="btn-delete" onClick={() => handleDelete(recipe._id)}>
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>添加食谱</h2>
            <div className="form-group">
              <label>菜名 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  console.log('菜名输入:', e.target.value);
                  setFormData({ ...formData, name: e.target.value });
                }}
                placeholder="例如：红烧肉、宫保鸡丁"
                required
              />
            </div>
            <div className="form-group">
              <label>简介</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="简单描述这道菜的特点"
                rows={2}
              />
            </div>
            <div className="form-group">
              <label>烹饪时间（分钟）*</label>
              <input
                type="number"
                value={formData.cookingTime}
                onChange={(e) => {
                  console.log('烹饪时间输入:', e.target.value);
                  setFormData({ ...formData, cookingTime: e.target.value });
                }}
                placeholder="例如：30、60、90"
                min="1"
                required
              />
            </div>
            <div className="form-group">
              <label>难度</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
              >
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
            </div>
            <div className="form-tips">
              <small>* 为必填项</small>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button 
                type="submit" 
                onClick={handleCreate}
                disabled={!formData.name || !formData.cookingTime}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recipes;

