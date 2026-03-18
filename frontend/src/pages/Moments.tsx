import { useState, useEffect, useRef } from 'react';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import useConfirm from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import BaiduMap, { BaiduMapRef, SelectedLocation } from '@/components/BaiduMap';
import { MAP_DEFAULT_CONFIG } from '@/config';
import './Moments.css';

interface User {
  _id: string;
  username: string;
  avatar?: string;
}

interface Reaction {
  userId: User;
  emoji: string;
}

interface Comment {
  userId: User;
  content: string;
  likes: string[];
  createdAt: string;
}

interface Moment {
  _id: string;
  type: string;
  content: string;
  images: string[];
  videos: string[];
  author: User;
  mentions: User[];
  reactions: Reaction[];
  comments: Comment[];
  isPinned: boolean;
  location?: string;
  viewCount: number;
  createdAt: string;
}

const typeLabels: Record<string, { label: string; icon: string }> = {
  post: { label: '动态', icon: '📝' },
  announcement: { label: '公告', icon: '📢' },
  milestone: { label: '里程碑', icon: '🏆' },
  photo: { label: '照片', icon: '📷' },
  video: { label: '视频', icon: '🎬' },
};

const emojis = ['👍', '❤️', '😄', '🎉', '😢', '😮'];

const Moments = () => {
  const { user } = useAuthStore();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [pinnedMoments, setPinnedMoments] = useState<Moment[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { toast, hideToast, success, error } = useToast();

  const [formData, setFormData] = useState({
    type: 'post',
    content: '',
    images: [] as string[],
    location: '',
  });

  // 位置选择相关状态
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(MAP_DEFAULT_CONFIG.center as [number, number]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const mapRef = useRef<BaiduMapRef>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [momentsRes, pinnedRes] = await Promise.all([
        api.get('/moments'),
        api.get('/moments/pinned'),
      ]);
      setMoments(Array.isArray(momentsRes.data) ? momentsRes.data : []);
      setPinnedMoments(Array.isArray(pinnedRes.data) ? pinnedRes.data : []);
    } catch (err) {
      console.error('加载数据失败:', err);
    }
  };

  const handleCreate = async () => {
    if (!formData.content.trim()) {
      error('请输入内容');
      return;
    }

    try {
      await api.post('/moments', formData);
      setShowCreateModal(false);
      setFormData({ type: 'post', content: '', images: [], location: '' });
      success('发布成功');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '发布失败');
    }
  };

  const handleReaction = async (momentId: string, emoji: string) => {
    try {
      await api.post(`/moments/${momentId}/reaction`, { emoji });
      setShowEmojiPicker(null);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const handleComment = async (momentId: string) => {
    const content = commentText[momentId]?.trim();
    if (!content) return;

    try {
      await api.post(`/moments/${momentId}/comment`, { content });
      setCommentText({ ...commentText, [momentId]: '' });
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '评论失败');
    }
  };

  const handleTogglePin = async (momentId: string) => {
    try {
      await api.put(`/moments/${momentId}/pin`);
      success('操作成功');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (momentId: string) => {
    const confirmed = await confirm({
      title: '删除动态',
      message: '确定要删除此动态吗？',
      confirmText: '删除',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/moments/${momentId}`);
      success('已删除');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '删除失败');
    }
  };

  // 处理位置选择
  const handleLocationSelect = (location: SelectedLocation) => {
    setSelectedLocation(location);
  };

  // 确认选择位置
  const confirmLocation = () => {
    if (selectedLocation?.address) {
      setFormData({ ...formData, location: selectedLocation.address });
    } else if (selectedLocation) {
      setFormData({ ...formData, location: `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}` });
    }
    setShowLocationPicker(false);
  };

  // 获取当前位置
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      error('您的浏览器不支持定位功能');
      return;
    }

    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter([latitude, longitude]);
        
        // 使用百度地图逆地理编码获取地址
        if (window.BMap) {
          const geoc = new window.BMap.Geocoder();
          const point = new window.BMap.Point(longitude, latitude);
          geoc.getLocation(point, (result: any) => {
            if (result) {
              const address = result.address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
              setSelectedLocation({ latitude, longitude, address });
              if (mapRef.current) {
                mapRef.current.panTo(latitude, longitude);
              }
            }
            setIsLoadingLocation(false);
          });
        } else {
          setSelectedLocation({ latitude, longitude });
          setIsLoadingLocation(false);
        }
      },
      (err) => {
        console.error('获取位置失败:', err);
        error('获取位置失败，请手动选择');
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 清除位置
  const clearLocation = () => {
    setFormData({ ...formData, location: '' });
    setSelectedLocation(null);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString();
  };

  const renderMoment = (moment: Moment) => (
    <div key={moment._id} className={`moment-card ${moment.isPinned ? 'pinned' : ''}`}>
      {moment.isPinned && <div className="pinned-badge">📌 置顶</div>}
      
      <div className="moment-header">
        <div className="author-avatar">
          {moment.author?.avatar ? (
            <img src={moment.author.avatar} alt="" />
          ) : (
            <span>{moment.author?.username?.charAt(0) || '?'}</span>
          )}
        </div>
        <div className="author-info">
          <span className="author-name">{moment.author?.username}</span>
          <span className="moment-time">{formatTime(moment.createdAt)}</span>
        </div>
        <div className="moment-type">
          <span className="type-badge">
            {typeLabels[moment.type]?.icon} {typeLabels[moment.type]?.label}
          </span>
        </div>
      </div>

      <div className="moment-content">
        <p>{moment.content}</p>
        {moment.images.length > 0 && (
          <div className={`moment-images grid-${Math.min(moment.images.length, 3)}`}>
            {moment.images.map((img, i) => (
              <img key={i} src={img} alt="" />
            ))}
          </div>
        )}
        {moment.location && (
          <div className="moment-location">📍 {moment.location}</div>
        )}
      </div>

      {/* 表情回复 */}
      {moment.reactions.length > 0 && (
        <div className="moment-reactions">
          {Object.entries(
            moment.reactions.reduce((acc, r) => {
              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          ).map(([emoji, count]) => (
            <span key={emoji} className="reaction-item">
              {emoji} {count}
            </span>
          ))}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="moment-actions">
        <div className="action-group">
          <div className="emoji-picker-container">
            <button
              className="action-btn"
              onClick={() => setShowEmojiPicker(showEmojiPicker === moment._id ? null : moment._id)}
            >
              👍 赞
            </button>
            {showEmojiPicker === moment._id && (
              <div className="emoji-picker">
                {emojis.map((emoji) => (
                  <span
                    key={emoji}
                    className="emoji-option"
                    onClick={() => handleReaction(moment._id, emoji)}
                  >
                    {emoji}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button className="action-btn">💬 评论</button>
          <span className="view-count">👁 {moment.viewCount}</span>
        </div>
        {moment.author?._id === user?.userId && (
          <div className="action-group">
            <button
              className="action-btn"
              onClick={() => handleTogglePin(moment._id)}
            >
              {moment.isPinned ? '取消置顶' : '📌 置顶'}
            </button>
            <button
              className="action-btn delete"
              onClick={() => handleDelete(moment._id)}
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      {/* 评论区 */}
      {moment.comments.length > 0 && (
        <div className="moment-comments">
          {moment.comments.slice(-3).map((comment, i) => (
            <div key={i} className="comment-item">
              <span className="comment-author">{comment.userId?.username}：</span>
              <span className="comment-content">{comment.content}</span>
              <span className="comment-time">{formatTime(comment.createdAt)}</span>
            </div>
          ))}
          {moment.comments.length > 3 && (
            <div className="more-comments">
              查看全部 {moment.comments.length} 条评论
            </div>
          )}
        </div>
      )}

      {/* 评论输入 */}
      <div className="comment-input">
        <input
          type="text"
          placeholder="写评论..."
          value={commentText[moment._id] || ''}
          onChange={(e) =>
            setCommentText({ ...commentText, [moment._id]: e.target.value })
          }
          onKeyDown={(e) => e.key === 'Enter' && handleComment(moment._id)}
        />
        <button onClick={() => handleComment(moment._id)}>发送</button>
      </div>
    </div>
  );

  return (
    <div className="moments-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">💬 家庭动态</h1>
          <p className="page-subtitle">分享生活点滴，记录美好瞬间</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + 发布动态
        </button>
      </div>

      <div className="moments-layout">
        {/* 主内容区 */}
        <div className="moments-feed">
          {/* 置顶公告 */}
          {pinnedMoments.length > 0 && (
            <div className="pinned-section">
              {pinnedMoments.map(renderMoment)}
            </div>
          )}

          {/* 动态列表 */}
          {moments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <p>暂无动态，发布第一条吧！</p>
            </div>
          ) : (
            moments.filter(m => !m.isPinned).map(renderMoment)
          )}
        </div>

        {/* 侧边栏 */}
        <div className="moments-sidebar">
          <div className="sidebar-card">
            <h3>快捷发布</h3>
            <div className="quick-actions">
              <button onClick={() => { setFormData({ ...formData, type: 'post' }); setShowCreateModal(true); }}>
                📝 动态
              </button>
              <button onClick={() => { setFormData({ ...formData, type: 'announcement' }); setShowCreateModal(true); }}>
                📢 公告
              </button>
              <button onClick={() => { setFormData({ ...formData, type: 'milestone' }); setShowCreateModal(true); }}>
                🏆 里程碑
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 发布模态框 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>发布{typeLabels[formData.type]?.label}</h2>
            <div className="form-group">
              <label>类型</label>
              <div className="type-selector">
                {Object.entries(typeLabels).map(([key, { label, icon }]) => (
                  <button
                    key={key}
                    className={`type-btn ${formData.type === key ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, type: key })}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>内容</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="分享你的想法..."
                rows={5}
              />
            </div>
            <div className="form-group">
              <label>位置（可选）</label>
              <div className="location-input-wrapper">
                {formData.location ? (
                  <div className="selected-location-display">
                    <span className="location-icon">📍</span>
                    <span className="location-text">{formData.location}</span>
                    <button type="button" className="clear-location-btn" onClick={clearLocation}>×</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="location-picker-btn"
                    onClick={() => setShowLocationPicker(true)}
                  >
                    📍 选择位置
                  </button>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button type="submit" onClick={handleCreate}>
                发布
              </button>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialogComponent}

      {/* 位置选择器弹窗 */}
      {showLocationPicker && (
        <div className="modal-overlay" onClick={() => setShowLocationPicker(false)}>
          <div className="modal-content location-picker-modal" onClick={(e) => e.stopPropagation()}>
            <h2>📍 选择位置</h2>
            
            <div className="location-picker-actions">
              <button 
                type="button" 
                className="get-current-btn"
                onClick={getCurrentLocation}
                disabled={isLoadingLocation}
              >
                {isLoadingLocation ? '⏳ 定位中...' : '🎯 获取当前位置'}
              </button>
            </div>

            <div className="location-picker-map">
              <BaiduMap
                ref={mapRef}
                center={mapCenter}
                zoom={15}
                selectMode={true}
                selectedLocation={selectedLocation}
                onLocationSelect={handleLocationSelect}
                style={{ width: '100%', height: '300px', borderRadius: '8px' }}
              />
            </div>

            {selectedLocation && (
              <div className="selected-location-info">
                <div className="location-address">
                  <span className="label">已选位置：</span>
                  <span className="value">{selectedLocation.address || `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`}</span>
                </div>
              </div>
            )}

            <p className="location-picker-tip">💡 点击地图选择位置，或点击获取当前位置</p>

            <div className="modal-actions">
              <button type="button" onClick={() => setShowLocationPicker(false)}>
                取消
              </button>
              <button 
                type="submit" 
                onClick={confirmLocation}
                disabled={!selectedLocation}
              >
                确认选择
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Moments;

