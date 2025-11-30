import { useState, useEffect } from 'react';
import api from '@/services/api';
import './Finance.css';

const Finance = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [statistics, setStatistics] = useState({ income: 0, expense: 0, balance: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 获取当前年月
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-11
      
      console.log(`查询统计 - 年: ${currentYear}, 月: ${currentMonth} (0-11表示1-12月)`);
      
      const [transResp, statsResp] = await Promise.all([
        api.get('/finance'),
        api.get('/finance/statistics', {
          params: {
            year: currentYear,
            month: currentMonth
          }
        }),
      ]);
      
      console.log('财务数据响应:', transResp.data);
      console.log('统计数据响应:', statsResp.data);
      
      const transactions = Array.isArray(transResp.data) ? transResp.data : [];
      setTransactions(transactions);
      
      const stats = statsResp.data || { income: 0, expense: 0, balance: 0 };
      console.log('设置统计数据:', stats);
      setStatistics(stats);
    } catch (error) {
      console.error('加载数据失败:', error);
      setTransactions([]);
      setStatistics({ income: 0, expense: 0, balance: 0 });
    }
  };

  const handleCreate = async () => {
    // 验证必填字段
    if (!formData.amount || !formData.category || !formData.description) {
      alert('请填写完整信息');
      return;
    }

    try {
      console.log('提交数据:', formData);
      
      const response = await api.post('/finance', {
        ...formData,
        amount: Number(formData.amount),
        date: new Date(formData.date),
      });
      
      console.log('创建成功:', response.data);
      
      setShowCreateModal(false);
      setFormData({
        type: 'expense',
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      
      // 重新加载数据
      await loadData();
      
      console.log('数据已刷新');
    } catch (error: any) {
      console.error('创建失败:', error);
      alert(error.response?.data?.message || '创建失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此记录？')) return;
    try {
      await api.delete(`/finance/${id}`);
      loadData();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const categories = {
    income: ['工资', '奖金', '投资收益', '其他收入'],
    expense: ['餐饮', '交通', '购物', '教育', '医疗', '娱乐', '房租', '水电', '其他'],
  };

  return (
    <div className="finance-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">💰 财务记账</h1>
          <p className="page-subtitle">管理家庭收支，清晰掌握财务状况</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + 添加记录
        </button>
      </div>

      <div className="stats-cards">
        <div className="stat-card income">
          <div className="stat-icon">💵</div>
          <div className="stat-info">
            <div className="stat-label">本月收入</div>
            <div className="stat-value">
              ¥{(statistics?.income || 0).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="stat-card expense">
          <div className="stat-icon">💸</div>
          <div className="stat-info">
            <div className="stat-label">本月支出</div>
            <div className="stat-value">
              ¥{(statistics?.expense || 0).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="stat-card balance">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-label">结余</div>
            <div className="stat-value" style={{ color: (statistics?.balance || 0) >= 0 ? '#4caf50' : '#f44336' }}>
              ¥{(statistics?.balance || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="transactions-container card">
        <h2>📝 最近记录</h2>
        {transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💰</div>
            <p>暂无记账记录</p>
          </div>
        ) : (
          <div className="transactions-list">
            {transactions.map((trans: any) => (
              <div key={trans._id} className={`transaction-item ${trans.type}`}>
                <div className="trans-info">
                  <div className="trans-description">{trans.description}</div>
                  <div className="trans-meta">
                    {trans.category} · {new Date(trans.date).toLocaleDateString('zh-CN')}
                  </div>
                </div>
                <div className="trans-right">
                  <div className={`trans-amount ${trans.type}`}>
                    {trans.type === 'income' ? '+' : '-'}¥{trans.amount.toLocaleString()}
                  </div>
                  <button className="trans-delete" onClick={() => handleDelete(trans._id)}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建记录模态框 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>添加记账记录</h2>
            <div className="form-group">
              <label>类型</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value, category: '' })}
              >
                <option value="income">收入</option>
                <option value="expense">支出</option>
              </select>
            </div>
            <div className="form-group">
              <label>金额</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>分类</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                <option value="">请选择分类</option>
                {(formData.type === 'income' ? categories.income : categories.expense).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>描述</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="简单描述这笔收支"
                required
              />
            </div>
            <div className="form-group">
              <label>日期</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button type="submit" onClick={handleCreate}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;

