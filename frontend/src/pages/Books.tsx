import { useState, useEffect } from 'react';
import api from '@/services/api';
import useConfirm from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './Books.css';

interface Book {
  _id: string;
  title: string;
  author?: string;
  cover?: string;
  isbn?: string;
  publisher?: string;
  category?: string;
  pages?: number;
  description?: string;
  purchaseDate?: string;
  price?: number;
  location?: string;
  status: string;
  currentReader?: { _id: string; username: string };
  currentPage?: number;
  rating?: number;
  review?: string;
  notes: { userId: { username: string }; content: string; page?: number; createdAt: string }[];
  isWishlist: boolean;
  createdBy: { username: string };
}

const categoryOptions = [
  { value: 'fiction', label: '小说', icon: '📖' },
  { value: 'non-fiction', label: '非虚构', icon: '📚' },
  { value: 'children', label: '儿童', icon: '🧒' },
  { value: 'education', label: '教育', icon: '🎓' },
  { value: 'professional', label: '专业', icon: '💼' },
  { value: 'other', label: '其他', icon: '📕' },
];

const Books = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [filter, setFilter] = useState('all');
  const [showWishlist, setShowWishlist] = useState(false);
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { toast, hideToast, success, error } = useToast();

  const [formData, setFormData] = useState({
    title: '', author: '', isbn: '', publisher: '', category: 'fiction', pages: '', description: '', price: '', location: '', isWishlist: false,
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get(`/books${showWishlist ? '?wishlist=true' : ''}`),
        api.get('/books/statistics'),
      ]);
      setBooks(Array.isArray(listRes.data) ? listRes.data : []);
      setStatistics(statsRes.data);
    } catch (err) { console.error('加载失败:', err); }
  };

  useEffect(() => { loadData(); }, [showWishlist]);

  const handleSubmit = async () => {
    if (!formData.title) { error('请填写书名'); return; }
    try {
      const data = { ...formData, pages: formData.pages ? parseInt(formData.pages) : undefined, price: formData.price ? parseFloat(formData.price) : undefined };
      if (editingBook) { await api.put(`/books/${editingBook._id}`, data); success('更新成功'); }
      else { await api.post('/books', data); success('添加成功'); }
      setShowModal(false); loadData();
    } catch (err: any) { error(err.response?.data?.message || '操作失败'); }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({ title: '删除图书', message: '确定要删除吗？', confirmText: '删除', type: 'danger' });
    if (!confirmed) return;
    try { await api.delete(`/books/${id}`); success('已删除'); setShowDetailModal(false); loadData(); } catch (err: any) { error(err.response?.data?.message || '删除失败'); }
  };

  const handleStartReading = async () => {
    if (!selectedBook) return;
    try { await api.post(`/books/${selectedBook._id}/start-reading`); success('开始阅读'); const res = await api.get(`/books/${selectedBook._id}`); setSelectedBook(res.data); loadData(); } catch (err: any) { error(err.response?.data?.message || '操作失败'); }
  };

  const handleFinishReading = async () => {
    if (!selectedBook) return;
    try { await api.post(`/books/${selectedBook._id}/finish`, { rating: 5 }); success('已完成阅读'); const res = await api.get(`/books/${selectedBook._id}`); setSelectedBook(res.data); loadData(); } catch (err: any) { error(err.response?.data?.message || '操作失败'); }
  };

  const openDetail = async (book: Book) => {
    try { const res = await api.get(`/books/${book._id}`); setSelectedBook(res.data); setShowDetailModal(true); } catch { error('加载失败'); }
  };

  const openEdit = () => {
    if (!selectedBook) return;
    setEditingBook(selectedBook);
    setFormData({
      title: selectedBook.title, author: selectedBook.author || '', isbn: selectedBook.isbn || '',
      publisher: selectedBook.publisher || '', category: selectedBook.category || 'fiction',
      pages: selectedBook.pages?.toString() || '', description: selectedBook.description || '',
      price: selectedBook.price?.toString() || '', location: selectedBook.location || '',
      isWishlist: selectedBook.isWishlist,
    });
    setShowModal(true);
  };

  const getCategoryInfo = (cat: string) => categoryOptions.find(c => c.value === cat) || categoryOptions[5];
  const formatCurrency = (v: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(v);
  const getStatusText = (status: string) => ({ available: '可借阅', reading: '阅读中', borrowed: '已借出', lost: '已丢失' }[status] || status);
  const getStatusColor = (status: string) => ({ available: '#27ae60', reading: '#3498db', borrowed: '#f39c12', lost: '#e74c3c' }[status] || '#888');

  const filteredBooks = books.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'reading') return b.status === 'reading';
    return b.category === filter;
  });

  return (
    <div className="books-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      <div className="page-header">
        <div><h1 className="page-title">📚 家庭书架</h1><p className="page-subtitle">记录阅读，分享知识</p></div>
        <div className="header-actions">
          <button className={`btn-tab ${!showWishlist ? 'active' : ''}`} onClick={() => setShowWishlist(false)}>书架</button>
          <button className={`btn-tab ${showWishlist ? 'active' : ''}`} onClick={() => setShowWishlist(true)}>愿望清单</button>
          <button className="btn-primary" onClick={() => { setEditingBook(null); setFormData({ title: '', author: '', isbn: '', publisher: '', category: 'fiction', pages: '', description: '', price: '', location: '', isWishlist: showWishlist }); setShowModal(true); }}>+ 添加</button>
        </div>
      </div>

      {statistics && !showWishlist && (
        <div className="stats-row">
          <div className="stat-card"><span className="stat-icon">📚</span><div className="stat-info"><span className="stat-value">{statistics.totalBooks}</span><span className="stat-label">藏书</span></div></div>
          <div className="stat-card"><span className="stat-icon">📖</span><div className="stat-info"><span className="stat-value">{statistics.readingCount}</span><span className="stat-label">在读</span></div></div>
          <div className="stat-card"><span className="stat-icon">💰</span><div className="stat-info"><span className="stat-value">{formatCurrency(statistics.totalValue)}</span><span className="stat-label">总价值</span></div></div>
          <div className="stat-card"><span className="stat-icon">⭐</span><div className="stat-info"><span className="stat-value">{statistics.averageRating}</span><span className="stat-label">平均评分</span></div></div>
        </div>
      )}

      <div className="filter-tabs">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>全部</button>
        <button className={filter === 'reading' ? 'active' : ''} onClick={() => setFilter('reading')}>📖 在读</button>
        {categoryOptions.map(cat => (
          <button key={cat.value} className={filter === cat.value ? 'active' : ''} onClick={() => setFilter(cat.value)}>{cat.icon}</button>
        ))}
      </div>

      <div className="books-grid">
        {filteredBooks.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📚</div><p>{showWishlist ? '愿望清单是空的' : '还没有添加图书'}</p></div>
        ) : (
          filteredBooks.map(book => (
            <div key={book._id} className="book-card" onClick={() => openDetail(book)}>
              <div className="book-cover">{book.cover ? <img src={book.cover} alt="" /> : <span>{getCategoryInfo(book.category || '').icon}</span>}</div>
              <div className="book-info">
                <h3>{book.title}</h3>
                {book.author && <p className="author">{book.author}</p>}
                <div className="book-meta">
                  <span className="status" style={{ color: getStatusColor(book.status) }}>{getStatusText(book.status)}</span>
                  {book.rating && <span className="rating">{'⭐'.repeat(book.rating)}</span>}
                </div>
                {book.status === 'reading' && book.pages && (
                  <div className="progress-bar"><div className="progress" style={{ width: `${((book.currentPage || 0) / book.pages) * 100}%` }} /></div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingBook ? '编辑图书' : (showWishlist ? '添加到愿望清单' : '添加图书')}</h2>
            <div className="form-group"><label>书名 *</label><input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
            <div className="form-row">
              <div className="form-group"><label>作者</label><input type="text" value={formData.author} onChange={e => setFormData({ ...formData, author: e.target.value })} /></div>
              <div className="form-group"><label>分类</label><select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>{categoryOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>ISBN</label><input type="text" value={formData.isbn} onChange={e => setFormData({ ...formData, isbn: e.target.value })} /></div>
              <div className="form-group"><label>出版社</label><input type="text" value={formData.publisher} onChange={e => setFormData({ ...formData, publisher: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>页数</label><input type="number" value={formData.pages} onChange={e => setFormData({ ...formData, pages: e.target.value })} /></div>
              <div className="form-group"><label>价格</label><input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>存放位置</label><input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="如：书房第二层" /></div>
            <div className="form-group"><label>描述</label><textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} /></div>
            <div className="modal-actions"><button type="button" onClick={() => setShowModal(false)}>取消</button><button type="submit" onClick={handleSubmit}>{editingBook ? '保存' : '添加'}</button></div>
          </div>
        </div>
      )}

      {showDetailModal && selectedBook && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-detail" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <div className="detail-cover">{selectedBook.cover ? <img src={selectedBook.cover} alt="" /> : <span>{getCategoryInfo(selectedBook.category || '').icon}</span>}</div>
              <div className="detail-title">
                <h2>{selectedBook.title}</h2>
                {selectedBook.author && <p className="author">{selectedBook.author}</p>}
                <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedBook.status) }}>{getStatusText(selectedBook.status)}</span>
              </div>
            </div>
            <div className="detail-body">
              <div className="info-grid">
                {selectedBook.publisher && <div className="info-item"><label>出版社</label><span>{selectedBook.publisher}</span></div>}
                {selectedBook.pages && <div className="info-item"><label>页数</label><span>{selectedBook.pages}页</span></div>}
                {selectedBook.price && <div className="info-item"><label>价格</label><span>{formatCurrency(selectedBook.price)}</span></div>}
                {selectedBook.location && <div className="info-item"><label>位置</label><span>{selectedBook.location}</span></div>}
                {selectedBook.isbn && <div className="info-item"><label>ISBN</label><span>{selectedBook.isbn}</span></div>}
                {selectedBook.rating && <div className="info-item"><label>评分</label><span>{'⭐'.repeat(selectedBook.rating)}</span></div>}
              </div>
              {selectedBook.description && <div className="description"><h4>📝 简介</h4><p>{selectedBook.description}</p></div>}
              {selectedBook.review && <div className="review"><h4>💭 书评</h4><p>{selectedBook.review}</p></div>}
              <div className="action-buttons">
                {selectedBook.status === 'available' && <button className="btn-action reading" onClick={handleStartReading}>📖 开始阅读</button>}
                {selectedBook.status === 'reading' && <button className="btn-action finish" onClick={handleFinishReading}>✅ 完成阅读</button>}
              </div>
            </div>
            <div className="detail-footer"><button className="btn-delete" onClick={() => handleDelete(selectedBook._id)}>🗑️ 删除</button><button className="btn-edit" onClick={openEdit}>✏️ 编辑</button><button onClick={() => setShowDetailModal(false)}>关闭</button></div>
          </div>
        </div>
      )}

      {ConfirmDialogComponent}
    </div>
  );
};

export default Books;






