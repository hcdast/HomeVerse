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
      const [transResp, statsResp] = await Promise.all([
        api.get('/finance'),
        api.get('/finance/statistics'),
      ]);
      const transactions = Array.isArray(transResp.data) ? transResp.data : [];
      setTransactions(transactions);
      setStatistics(statsResp.data || { income: 0, expense: 0, balance: 0 });
    } catch (error) {
      console.error('加载数据失败:', error);
      setTransactions([]);
      setStatistics({ income: 0, expense: 0, balance: 0 });
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/finance', {
        ...formData,
        amount: Number(formData.amount),
        date: new Date(formData.date),
      });
      setShowCreateModal(false);
      setFormData({
        type: 'expense',
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      loadData();
    } catch (error: any) {
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
            <div className="stat-value">¥{statistics.income.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card expense">
          <div className="stat-icon">💸</div>
          <div className="stat-info">
            <div className="stat-label">本月支出</div>
            <div className="stat-value">¥{statistics.expense.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card balance">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-label">结余</div>
            <div className="stat-value">¥{statistics.balance.toLocaleString()}</div>
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
                <div className={`trans-amount ${trans.type}`}>
                  {trans.type === 'income' ? '+' : '-'}¥{trans.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Finance;

