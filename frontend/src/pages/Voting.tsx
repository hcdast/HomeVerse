import { useState, useEffect } from 'react';
import api from '../services/api';
import './Voting.css';

interface VoteOption {
  _id: string;
  text: string;
  description?: string;
  voteCount: number;
  voters: { _id: string; username: string; avatar?: string }[];
}

interface Vote {
  _id: string;
  title: string;
  description?: string;
  type: 'single' | 'multiple' | 'ranking';
  status: 'active' | 'closed' | 'draft';
  options: VoteOption[];
  createdBy: { _id: string; username: string; avatar?: string };
  expiresAt?: string;
  isAnonymous: boolean;
  participants: { _id: string; username: string }[];
  result?: {
    winnerText?: string;
    totalVotes?: number;
  };
  createdAt: string;
}

interface Statistics {
  total: number;
  active: number;
  closed: number;
  totalParticipation: number;
}

const Voting = () => {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'closed' | 'all'>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVote, setSelectedVote] = useState<Vote | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  // 创建表单
  const [newVote, setNewVote] = useState({
    title: '',
    description: '',
    type: 'single' as 'single' | 'multiple',
    options: ['', ''],
    expiresAt: '',
    isAnonymous: false,
  });

  useEffect(() => {
    loadVotes();
    loadStatistics();
  }, [activeTab]);

  const loadVotes = async () => {
    try {
      setLoading(true);
      const params = activeTab === 'all' ? '' : `?status=${activeTab}`;
      const res = await api.get(`/voting${params}`);
      setVotes(res.data.votes || res.data);
    } catch (err) {
      console.error('加载投票失败', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const res = await api.get('/voting/statistics');
      setStatistics(res.data);
    } catch (err) {
      console.error('加载统计失败', err);
    }
  };

  const handleCreateVote = async () => {
    if (!newVote.title || newVote.options.filter((o) => o.trim()).length < 2) {
      alert('请填写标题和至少两个选项');
      return;
    }

    try {
      await api.post('/voting', {
        ...newVote,
        options: newVote.options.filter((o) => o.trim()).map((text) => ({ text })),
        expiresAt: newVote.expiresAt || undefined,
      });
      setShowCreateModal(false);
      setNewVote({
        title: '',
        description: '',
        type: 'single',
        options: ['', ''],
        expiresAt: '',
        isAnonymous: false,
      });
      loadVotes();
      loadStatistics();
    } catch (err) {
      console.error('创建投票失败', err);
    }
  };

  const handleCastVote = async () => {
    if (!selectedVote || selectedOptions.length === 0) return;

    try {
      await api.post(`/voting/${selectedVote._id}/vote`, {
        optionIds: selectedOptions,
      });
      setSelectedVote(null);
      setSelectedOptions([]);
      loadVotes();
    } catch (err) {
      console.error('投票失败', err);
    }
  };

  const handleCloseVote = async (voteId: string) => {
    try {
      await api.put(`/voting/${voteId}/close`);
      loadVotes();
      loadStatistics();
    } catch (err) {
      console.error('关闭投票失败', err);
    }
  };

  const handleDeleteVote = async (voteId: string) => {
    if (!confirm('确定要删除这个投票吗？')) return;

    try {
      await api.delete(`/voting/${voteId}`);
      loadVotes();
      loadStatistics();
    } catch (err) {
      console.error('删除投票失败', err);
    }
  };

  const addOption = () => {
    setNewVote((prev) => ({
      ...prev,
      options: [...prev.options, ''],
    }));
  };

  const updateOption = (index: number, value: string) => {
    setNewVote((prev) => ({
      ...prev,
      options: prev.options.map((o, i) => (i === index ? value : o)),
    }));
  };

  const removeOption = (index: number) => {
    if (newVote.options.length <= 2) return;
    setNewVote((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const toggleOption = (optionId: string) => {
    if (!selectedVote) return;

    if (selectedVote.type === 'single') {
      setSelectedOptions([optionId]);
    } else {
      setSelectedOptions((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId]
      );
    }
  };

  const getTotalVotes = (vote: Vote) => {
    return vote.options.reduce((sum, opt) => sum + opt.voteCount, 0);
  };

  const getPercentage = (voteCount: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((voteCount / total) * 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
  };

  return (
    <div className="voting-page">
      <div className="page-header">
        <div className="header-content">
          <h1>🗳️ 家庭投票</h1>
          <p>民主决策，让每个人的声音都被听到</p>
        </div>
        <button className="btn-create" onClick={() => setShowCreateModal(true)}>
          ➕ 发起投票
        </button>
      </div>

      {statistics && (
        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-value">{statistics.active}</span>
            <span className="stat-label">进行中</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{statistics.closed}</span>
            <span className="stat-label">已结束</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{statistics.totalParticipation}</span>
            <span className="stat-label">参与人次</span>
          </div>
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          进行中
        </button>
        <button
          className={`tab ${activeTab === 'closed' ? 'active' : ''}`}
          onClick={() => setActiveTab('closed')}
        >
          已结束
        </button>
        <button
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          全部
        </button>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <div className="votes-list">
          {votes.length === 0 ? (
            <div className="empty">暂无投票</div>
          ) : (
            votes.map((vote) => {
              const totalVotes = getTotalVotes(vote);
              const isActive = vote.status === 'active';

              return (
                <div key={vote._id} className={`vote-card ${vote.status}`}>
                  <div className="vote-header">
                    <div className="vote-title-row">
                      <h3>{vote.title}</h3>
                      <span className={`status-badge ${vote.status}`}>
                        {vote.status === 'active' ? '进行中' : '已结束'}
                      </span>
                    </div>
                    {vote.description && (
                      <p className="vote-description">{vote.description}</p>
                    )}
                    <div className="vote-meta">
                      <span>由 {vote.createdBy?.username} 发起</span>
                      {vote.expiresAt && (
                        <span>截止 {formatDate(vote.expiresAt)}</span>
                      )}
                      <span>{vote.participants?.length || 0} 人参与</span>
                    </div>
                  </div>

                  <div className="vote-options">
                    {vote.options.map((option) => {
                      const percentage = getPercentage(option.voteCount, totalVotes);

                      return (
                        <div
                          key={option._id}
                          className={`vote-option ${!isActive ? 'readonly' : ''}`}
                          onClick={() => isActive && setSelectedVote(vote)}
                        >
                          <div className="option-info">
                            <span className="option-text">{option.text}</span>
                            <span className="option-count">
                              {option.voteCount} 票 ({percentage}%)
                            </span>
                          </div>
                          <div className="option-bar">
                            <div
                              className="option-bar-fill"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {vote.result && (
                    <div className="vote-result">
                      🏆 获胜选项：{vote.result.winnerText}
                    </div>
                  )}

                  <div className="vote-actions">
                    {isActive && (
                      <>
                        <button
                          className="btn-vote"
                          onClick={() => setSelectedVote(vote)}
                        >
                          参与投票
                        </button>
                        <button
                          className="btn-close"
                          onClick={() => handleCloseVote(vote._id)}
                        >
                          结束投票
                        </button>
                      </>
                    )}
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteVote(vote._id)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 创建投票弹窗 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h2>发起新投票</h2>

            <div className="form-group">
              <label>投票标题</label>
              <input
                type="text"
                value={newVote.title}
                onChange={(e) => setNewVote((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="例如：今晚吃什么？"
              />
            </div>

            <div className="form-group">
              <label>描述（可选）</label>
              <textarea
                value={newVote.description}
                onChange={(e) => setNewVote((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="添加更多说明..."
              />
            </div>

            <div className="form-group">
              <label>投票类型</label>
              <select
                value={newVote.type}
                onChange={(e) =>
                  setNewVote((prev) => ({ ...prev, type: e.target.value as 'single' | 'multiple' }))
                }
              >
                <option value="single">单选</option>
                <option value="multiple">多选</option>
              </select>
            </div>

            <div className="form-group">
              <label>选项</label>
              {newVote.options.map((option, index) => (
                <div key={index} className="option-input-row">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`选项 ${index + 1}`}
                  />
                  {newVote.options.length > 2 && (
                    <button
                      className="btn-remove-option"
                      onClick={() => removeOption(index)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button className="btn-add-option" onClick={addOption}>
                + 添加选项
              </button>
            </div>

            <div className="form-group">
              <label>截止时间（可选）</label>
              <input
                type="datetime-local"
                value={newVote.expiresAt}
                onChange={(e) => setNewVote((prev) => ({ ...prev, expiresAt: e.target.value }))}
              />
            </div>

            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={newVote.isAnonymous}
                  onChange={(e) =>
                    setNewVote((prev) => ({ ...prev, isAnonymous: e.target.checked }))
                  }
                />
                匿名投票
              </label>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button className="btn-confirm" onClick={handleCreateVote}>
                发起投票
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 投票弹窗 */}
      {selectedVote && (
        <div className="modal-overlay" onClick={() => setSelectedVote(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedVote.title}</h2>
            <p className="vote-type-hint">
              {selectedVote.type === 'single' ? '单选' : '多选'}
            </p>

            <div className="voting-options">
              {selectedVote.options.map((option) => (
                <label
                  key={option._id}
                  className={`voting-option ${selectedOptions.includes(option._id) ? 'selected' : ''}`}
                >
                  <input
                    type={selectedVote.type === 'single' ? 'radio' : 'checkbox'}
                    checked={selectedOptions.includes(option._id)}
                    onChange={() => toggleOption(option._id)}
                  />
                  <span>{option.text}</span>
                </label>
              ))}
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setSelectedVote(null)}>
                取消
              </button>
              <button
                className="btn-confirm"
                onClick={handleCastVote}
                disabled={selectedOptions.length === 0}
              >
                确认投票
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Voting;
