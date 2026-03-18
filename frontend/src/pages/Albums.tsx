import { useEffect, useState } from 'react';
import api from '@/services/api';
import FileUploader from '@/components/FileUploader';
import ImagePreview from '@/components/ImagePreview';
import Loading from '@/components/Loading';
import useConfirm from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './Albums.css';

interface Album {
  _id: string;
  title: string;
  description: string;
  coverImage: string;
  photos: any[];
  createdAt: string;
}

/**
 * 获取图片URL
 * 如果是完整URL（http/https开头）直接使用，否则加上 /api 前缀
 */
const getImageUrl = (path: string): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `/api${path}`;
};

interface UploadProgress {
  total: number;
  uploaded: number;
  failed: number;
  status: 'idle' | 'uploading' | 'completed';
}

const Albums = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlbum, setNewAlbum] = useState({ title: '', description: '' });
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [showAlbumDetail, setShowAlbumDetail] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    total: 0,
    uploaded: 0,
    failed: 0,
    status: 'idle',
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { toast, hideToast, error, success } = useToast();

  useEffect(() => {
    fetchAlbums();
  }, []);

  const fetchAlbums = async () => {
    try {
      const response = await api.get('/albums');
      setAlbums(response.data);
    } catch (error) {
      console.error('获取相册失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/albums', newAlbum);
      setShowCreateModal(false);
      setNewAlbum({ title: '', description: '' });
      fetchAlbums();
    } catch (err) {
      console.error('创建相册失败:', err);
      error('创建相册失败，请重试');
    }
  };

  // 单张照片上传（保留向后兼容）
  const handleUploadPhoto = async (file: File) => {
    if (!selectedAlbum) return;

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post(`/albums/${selectedAlbum._id}/photos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      // 重新获取相册详情
      const response = await api.get(`/albums/${selectedAlbum._id}`);
      setSelectedAlbum(response.data);
      fetchAlbums(); // 更新列表
      success('照片上传成功');
    } catch (err) {
      console.error('上传照片失败:', err);
      error('上传照片失败，请重试');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // 批量照片上传
  const handleUploadPhotos = async (files: File[]) => {
    if (!selectedAlbum) return;

    setUploadingPhoto(true);
    setUploadProgress({
      total: files.length,
      uploaded: 0,
      failed: 0,
      status: 'uploading',
    });

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await api.post(`/albums/${selectedAlbum._id}/photos/batch`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const result = response.data;
      setUploadProgress({
        total: result.total,
        uploaded: result.success,
        failed: result.failed,
        status: 'completed',
      });
      
      // 重新获取相册详情
      const albumResponse = await api.get(`/albums/${selectedAlbum._id}`);
      setSelectedAlbum(albumResponse.data);
      fetchAlbums(); // 更新列表
      
      if (result.failed > 0) {
        success(`成功上传 ${result.success} 张照片，${result.failed} 张失败`);
      } else {
        success(`成功上传 ${result.success} 张照片`);
      }
      
      // 3秒后重置进度状态
      setTimeout(() => {
        setUploadProgress({
          total: 0,
          uploaded: 0,
          failed: 0,
          status: 'idle',
        });
      }, 3000);
    } catch (err) {
      console.error('批量上传照片失败:', err);
      error('批量上传照片失败，请重试');
      setUploadProgress({
        total: files.length,
        uploaded: 0,
        failed: files.length,
        status: 'completed',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAlbumClick = async (album: Album) => {
    try {
      const response = await api.get(`/albums/${album._id}`);
      setSelectedAlbum(response.data);
      setShowAlbumDetail(true);
    } catch (error) {
      console.error('获取相册详情失败:', error);
    }
  };

  const handleDeletePhoto = async (albumId: string, photoId: string) => {
    const confirmed = await confirm({
      title: '删除照片',
      message: '确定要删除这张照片吗？删除后无法恢复。',
      confirmText: '删除',
      cancelText: '取消',
      type: 'danger',
    });
    
    if (!confirmed) return;

    try {
      await api.delete(`/albums/${albumId}/photos/${photoId}`);
      if (selectedAlbum) {
        const response = await api.get(`/albums/${albumId}`);
        setSelectedAlbum(response.data);
      }
      fetchAlbums();
    } catch (err) {
      console.error('删除照片失败:', err);
      error('删除照片失败，请重试');
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="albums-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      <div className="page-header">
        <div>
          <h1>相册管理</h1>
          <p className="page-subtitle">创建相册，记录美好时光</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="create-btn">
          + 创建相册
        </button>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>创建相册</h2>
            <form onSubmit={handleCreateAlbum}>
              <input
                type="text"
                placeholder="相册标题"
                value={newAlbum.title}
                onChange={(e) => setNewAlbum({ ...newAlbum, title: e.target.value })}
                required
              />
              <textarea
                placeholder="相册描述"
                value={newAlbum.description}
                onChange={(e) => setNewAlbum({ ...newAlbum, description: e.target.value })}
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)}>
                  取消
                </button>
                <button type="submit">创建</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="albums-grid">
        {albums.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📷</div>
            <div className="empty-text">还没有相册，创建一个吧！</div>
          </div>
        ) : (
          albums.map((album) => (
            <div
              key={album._id}
              className="album-card"
              onClick={() => handleAlbumClick(album)}
            >
              <div className="album-cover">
                {album.coverImage ? (
                  <img src={getImageUrl(album.coverImage)} alt={album.title} />
                ) : (
                  <div className="album-placeholder">📷</div>
                )}
                <div className="album-overlay">
                  <span className="album-photo-count">{album.photos?.length || 0} 张</span>
                </div>
              </div>
              <div className="album-info">
                <h3>{album.title}</h3>
                <p>{album.description || '暂无描述'}</p>
                <div className="album-meta">
                  <span>{new Date(album.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 相册详情模态框 */}
      {showAlbumDetail && selectedAlbum && (
        <div className="modal-overlay" onClick={() => setShowAlbumDetail(false)}>
          <div className="album-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="album-detail-header">
              <h2>{selectedAlbum.title}</h2>
              <button className="modal-close-btn" onClick={() => setShowAlbumDetail(false)}>×</button>
            </div>
            <p className="album-detail-description">{selectedAlbum.description || '暂无描述'}</p>
            
            {/* 上传照片区域 */}
            <div className="album-upload-section">
              <FileUploader
                onUploadMultiple={handleUploadPhotos}
                onUpload={handleUploadPhoto}
                accept="image/*"
                multiple={true}
                maxSize={10 * 1024 * 1024}
                maxFiles={100}
                disabled={uploadingPhoto}
              >
                <div className="file-uploader-content">
                  <div className="file-uploader-icon">{uploadingPhoto ? '⏳' : '📤'}</div>
                  <div className="file-uploader-text">
                    {uploadingPhoto 
                      ? `上传中... ${uploadProgress.uploaded}/${uploadProgress.total}`
                      : '点击或拖拽照片到此处上传（支持批量）'}
                  </div>
                  {!uploadingPhoto && (
                    <div className="file-uploader-hint">最多一次上传100张，单张不超过10MB</div>
                  )}
                </div>
              </FileUploader>
              
              {/* 上传进度条 */}
              {uploadProgress.status !== 'idle' && (
                <div className="upload-progress">
                  <div className="upload-progress-bar">
                    <div 
                      className="upload-progress-fill"
                      style={{ 
                        width: `${uploadProgress.total > 0 
                          ? (uploadProgress.uploaded / uploadProgress.total) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                  <div className="upload-progress-text">
                    {uploadProgress.status === 'uploading' 
                      ? `正在上传 ${uploadProgress.uploaded}/${uploadProgress.total} 张照片...`
                      : uploadProgress.failed > 0
                        ? `已完成：成功 ${uploadProgress.uploaded} 张，失败 ${uploadProgress.failed} 张`
                        : `全部上传完成：${uploadProgress.uploaded} 张照片`
                    }
                  </div>
                </div>
              )}
            </div>

            {/* 照片网格 */}
            <div className="photos-grid">
              {selectedAlbum.photos && selectedAlbum.photos.length > 0 ? (
                selectedAlbum.photos.map((photo: any) => (
                  <div key={photo._id} className="photo-item">
                    <img
                      src={getImageUrl(photo.path)}
                      alt={photo.originalName}
                      onClick={() => setPreviewImage(getImageUrl(photo.path))}
                    />
                    <div className="photo-actions">
                      <button
                        className="photo-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhoto(selectedAlbum._id, photo._id);
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-photos">还没有照片，上传一些吧！</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 图片预览 */}
      {previewImage && (
        <ImagePreview imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
      )}
      {ConfirmDialogComponent}
    </div>
  );
};

export default Albums;

