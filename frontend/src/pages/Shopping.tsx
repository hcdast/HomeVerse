import { useState, useEffect } from 'react';
import api from '@/services/api';
import useConfirm from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './Shopping.css';

interface ShoppingItem {
  _id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  priority: string;
  status: string;
  assignedTo?: { _id: string; username: string; avatar?: string };
  estimatedPrice?: number;
  actualPrice?: number;
  purchasedBy?: { _id: string; username: string };
  purchasedAt?: string;
  recurringType: string;
  notes?: string;
  createdBy?: { _id: string; username: string };
  createdAt: string;
}

interface Statistics {
  pending: number;
  purchased: number;
  totalSpent: number;
  thisMonthSpent: number;
  byCategory: { category: string; count: number; spent: number }[];
}

const categoryLabels: Record<string, string> = {
  food: '🍎 食品',
  daily: '🧴 日用品',
  appliance: '📺 家电',
  clothing: '👕 服装',
  other: '📦 其他',
};

const priorityLabels: Record<string, { label: string; color: string }> = {
  low: { label: '低', color: '#95a5a6' },
  medium: { label: '中', color: '#3498db' },
  high: { label: '高', color: '#e67e22' },
  urgent: { label: '紧急', color: '#e74c3c' },
};

const recurringLabels: Record<string, string> = {
  once: '一次性',
  weekly: '每周',
  biweekly: '每两周',
  monthly: '每月',
};

const Shopping = () => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState<string | null>(null);
  const [actualPrice, setActualPrice] = useState<string>('');
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { toast, hideToast, success, error } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    category: 'other',
    quantity: 1,
    unit: '个',
    priority: 'medium',
    estimatedPrice: '',
    recurringType: 'once',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab, filterCategory]);

  const loadData = async () => {
    try {
      const params: any = {};
      if (activeTab === 'pending') {
        params.status = 'pending';
      } else {
        params.status = 'purchased';
      }
      if (filterCategory) {
        params.category = filterCategory;
      }

      const [itemsRes, statsRes] = await Promise.all([
        api.get('/shopping', { params }),
        api.get('/shopping/statistics'),
      ]);

      setItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
      setStatistics(statsRes.data);
    } catch (err) {
      console.error('加载数据失败:', err);
      setItems([]);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      error('请输入物品名称');
      return;
    }

    try {
      await api.post('/shopping', {
        ...formData,
        estimatedPrice: formData.estimatedPrice ? parseFloat(formData.estimatedPrice) : undefined,
      });
      setShowCreateModal(false);
      setFormData({
        name: '',
        category: 'other',
        quantity: 1,
        unit: '个',
        priority: 'medium',
        estimatedPrice: '',
        recurringType: 'once',
        notes: '',
      });
      success('添加成功');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '添加失败');
    }
  };

  const handlePurchase = async (id: string) => {
    try {
      await api.put(`/shopping/${id}/purchase`, {
        actualPrice: actualPrice ? parseFloat(actualPrice) : undefined,
      });
      setShowPurchaseModal(null);
      setActualPrice('');
      success('已标记为已购买');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const handleCancel = async (id: string) => {
    const confirmed = await confirm({
      title: '取消购物项',
      message: '确定要取消此购物项吗？',
      confirmText: '取消购物项',
      type: 'warning',
    });
    if (!confirmed) return;

    try {
      await api.put(`/shopping/${id}/cancel`);
      success('已取消');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '删除购物项',
      message: '确定要删除此购物项吗？此操作不可恢复。',
      confirmText: '删除',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/shopping/${id}`);
      success('已删除');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '删除失败');
    }
  };

  return (
    <div className="shopping-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      
      <div className="page-header">
        <div>
          <h1 className="page-title">🛒 购物清单</h1>
          <p className="page-subtitle">管理家庭购物需求，协作采购更高效</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + 添加物品
        </button>
      </div>

      {/* 统计卡片 */}
      {statistics && (
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-info">
              <div className="stat-number">{statistics.pending}</div>
              <div className="stat-label">待购买</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <div className="stat-number">{statistics.purchased}</div>
              <div className="stat-label">已购买</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <div className="stat-number">¥{statistics.thisMonthSpent.toFixed(2)}</div>
              <div className="stat-label">本月消费</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <div className="stat-number">¥{statistics.totalSpent.toFixed(2)}</div>
              <div className="stat-label">累计消费</div>
            </div>
          </div>
        </div>
      )}

      {/* 标签页和筛选 */}
      <div className="toolbar">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            待购买
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            购买历史
          </button>
        </div>
        <select
          className="category-filter"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">全部分类</option>
          <option value="food">食品</option>
          <option value="daily">日用品</option>
          <option value="appliance">家电</option>
          <option value="clothing">服装</option>
          <option value="other">其他</option>
        </select>
      </div>

      {/* 购物清单 */}
      <div className="shopping-list">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛒</div>
            <p>{activeTab === 'pending' ? '暂无待购买物品' : '暂无购买记录'}</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item._id} className={`shopping-item ${item.status}`}>
              <div className="item-main">
                <div className="item-category">{categoryLabels[item.category] || item.category}</div>
                <div className="item-name">{item.name}</div>
                <div className="item-quantity">
                  {item.quantity} {item.unit}
                </div>
                <div
                  className="item-priority"
                  style={{ backgroundColor: priorityLabels[item.priority]?.color }}
                >
                  {priorityLabels[item.priority]?.label}
                </div>
                {item.recurringType !== 'once' && (
                  <div className="item-recurring">
                    🔄 {recurringLabels[item.recurringType]}
                  </div>
                )}
              </div>

              <div className="item-details">
                {item.estimatedPrice && (
                  <span className="estimated-price">预估: ¥{item.estimatedPrice}</span>
                )}
                {item.actualPrice && (
                  <span className="actual-price">实际: ¥{item.actualPrice}</span>
                )}
                {item.assignedTo && (
                  <span className="assigned-to">👤 {item.assignedTo.username}</span>
                )}
                {item.purchasedBy && (
                  <span className="purchased-by">
                    ✓ {item.purchasedBy.username} 购买于{' '}
                    {new Date(item.purchasedAt!).toLocaleDateString()}
                  </span>
                )}
                {item.notes && <span className="item-notes">📝 {item.notes}</span>}
              </div>

              {item.status === 'pending' && (
                <div className="item-actions">
                  <button
                    className="btn-success"
                    onClick={() => {
                      setShowPurchaseModal(item._id);
                      setActualPrice(item.estimatedPrice?.toString() || '');
                    }}
                  >
                    ✓ 已购买
                  </button>
                  <button className="btn-secondary" onClick={() => handleCancel(item._id)}>
                    取消
                  </button>
                  <button className="btn-danger" onClick={() => handleDelete(item._id)}>
                    删除
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 创建模态框 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>添加购物项</h2>
            <div className="form-group">
              <label>物品名称 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：牛奶、洗衣液"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>分类</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="food">食品</option>
                  <option value="daily">日用品</option>
                  <option value="appliance">家电</option>
                  <option value="clothing">服装</option>
                  <option value="other">其他</option>
                </select>
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
                  <option value="urgent">紧急</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>数量</label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="form-group">
                <label>单位</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="个、箱、瓶"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>预估价格</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.estimatedPrice}
                  onChange={(e) => setFormData({ ...formData, estimatedPrice: e.target.value })}
                  placeholder="¥"
                />
              </div>
              <div className="form-group">
                <label>重复购买</label>
                <select
                  value={formData.recurringType}
                  onChange={(e) => setFormData({ ...formData, recurringType: e.target.value })}
                >
                  <option value="once">一次性</option>
                  <option value="weekly">每周</option>
                  <option value="biweekly">每两周</option>
                  <option value="monthly">每月</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>备注</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="特殊要求或说明"
                rows={2}
              />
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button type="submit" onClick={handleCreate}>
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 购买确认模态框 */}
      {showPurchaseModal && (
        <div className="modal-overlay" onClick={() => setShowPurchaseModal(null)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <h2>确认购买</h2>
            <div className="form-group">
              <label>实际花费</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={actualPrice}
                onChange={(e) => setActualPrice(e.target.value)}
                placeholder="输入实际价格"
              />
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowPurchaseModal(null)}>
                取消
              </button>
              <button type="submit" onClick={() => handlePurchase(showPurchaseModal)}>
                确认购买
              </button>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialogComponent}
    </div>
  );
};

export default Shopping;

