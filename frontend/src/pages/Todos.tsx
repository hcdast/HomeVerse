import { useState, useEffect } from 'react';
import api from '@/services/api';
import './Todos.css';

const Todos = () => {
  const [todos, setTodos] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    assignedTo: '',
  });

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      const response = await api.get('/todos');
      const data = Array.isArray(response.data) ? response.data : [];
      setTodos(data);
    } catch (error) {
      console.error('加载失败:', error);
      setTodos([]);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/todos', formData);
      setShowCreateModal(false);
      setFormData({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '' });
      loadTodos();
    } catch (error: any) {
      alert(error.response?.data?.message || '创建失败');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.put(`/todos/${id}/toggle`);
      loadTodos();
    } catch (error) {
      console.error('切换状态失败:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此任务？')) return;
    try {
      await api.delete(`/todos/${id}`);
      loadTodos();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: '#f44336',
      medium: '#ff9800',
      low: '#4caf50',
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="todos-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">✅ 待办清单</h1>
          <p className="page-subtitle">记录和追踪家庭任务</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + 新建任务
        </button>
      </div>

      <div className="todos-stats">
        <div className="stat-item">
          <span className="stat-number">{todos.filter(t => !t.completed).length}</span>
          <span className="stat-label">待完成</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{todos.filter(t => t.completed).length}</span>
          <span className="stat-label">已完成</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{todos.length}</span>
          <span className="stat-label">总任务</span>
        </div>
      </div>

      <div className="todos-container card">
        {todos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <p>暂无待办事项，创建第一个任务吧！</p>
          </div>
        ) : (
          <div className="todos-list">
            {todos.map((todo) => (
              <div key={todo._id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => handleToggle(todo._id)}
                  className="todo-checkbox"
                />
                <div className="todo-content">
                  <div className="todo-title">{todo.title}</div>
                  {todo.description && <div className="todo-description">{todo.description}</div>}
                  <div className="todo-meta">
                    <span className="priority-badge" style={{ background: getPriorityColor(todo.priority) }}>
                      {todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低'}
                    </span>
                    {todo.dueDate && (
                      <span className="due-date">
                        📅 {new Date(todo.dueDate).toLocaleDateString('zh-CN')}
                      </span>
                    )}
                    {todo.assignedTo && (
                      <span className="assigned">
                        👤 {todo.assignedTo.username}
                      </span>
                    )}
                  </div>
                </div>
                <button className="delete-btn" onClick={() => handleDelete(todo._id)}>
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>新建任务</h2>
            <div className="form-group">
              <label>任务标题</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="输入任务标题"
              />
            </div>
            <div className="form-group">
              <label>描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="任务详情"
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>优先级</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>
            <div className="form-group">
              <label>截止日期</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
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

export default Todos;

