import { useEffect, useState } from 'react';
import api from '@/services/api';
import FileUploader from '@/components/FileUploader';
import ImagePreview from '@/components/ImagePreview';
import Loading from '@/components/Loading';
import './Albums.css';

interface Album {
  _id: string;
  title: string;
  description: string;
  coverImage: string;
  photos: any[];
  createdAt: string;
}

const Albums = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlbum, setNewAlbum] = useState({ title: '', description: '' });
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [showAlbumDetail, setShowAlbumDetail] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
    } catch (error) {
      console.error('创建相册失败:', error);
      alert('创建相册失败，请重试');
    }
  };

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
    } catch (error) {
      console.error('上传照片失败:', error);
      alert('上传照片失败，请重试');
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
    if (!confirm('确定要删除这张照片吗？')) return;

    try {
      await api.delete(`/albums/${albumId}/photos/${photoId}`);
      if (selectedAlbum) {
        const response = await api.get(`/albums/${albumId}`);
        setSelectedAlbum(response.data);
      }
      fetchAlbums();
    } catch (error) {
      console.error('删除照片失败:', error);
      alert('删除照片失败，请重试');
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="albums-page">
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
                  <img src={`/api${album.coverImage}`} alt={album.title} />
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
                onUpload={handleUploadPhoto}
                accept="image/*"
                maxSize={10 * 1024 * 1024}
                disabled={uploadingPhoto}
              >
                <div className="file-uploader-content">
                  <div className="file-uploader-icon">{uploadingPhoto ? '⏳' : '📤'}</div>
                  <div className="file-uploader-text">
                    {uploadingPhoto ? '上传中...' : '点击或拖拽照片到此处上传'}
                  </div>
                </div>
              </FileUploader>
            </div>

            {/* 照片网格 */}
            <div className="photos-grid">
              {selectedAlbum.photos && selectedAlbum.photos.length > 0 ? (
                selectedAlbum.photos.map((photo: any) => (
                  <div key={photo._id} className="photo-item">
                    <img
                      src={`/api${photo.path}`}
                      alt={photo.originalName}
                      onClick={() => setPreviewImage(`/api${photo.path}`)}
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
    </div>
  );
};

export default Albums;

