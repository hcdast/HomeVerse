import { useEffect, useState } from 'react';
import api from '@/services/api';
import FileUploader from '@/components/FileUploader';
import Loading from '@/components/Loading';
import useConfirm from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './Files.css';

interface FileItem {
  _id: string;
  originalName: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

const Files = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { toast, hideToast, error } = useToast();

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await api.get('/files');
      setFiles(response.data);
    } catch (error) {
      console.error('获取文件失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: globalThis.File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file as Blob);

    try {
      await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      fetchFiles();
    } catch (err: any) {
      console.error('上传文件失败:', err);
      error(err.response?.data?.message || '上传文件失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    const confirmed = await confirm({
      title: '删除文件',
      message: '确定要删除这个文件吗？删除后无法恢复。',
      confirmText: '删除',
      cancelText: '取消',
      type: 'danger',
    });
    
    if (!confirmed) return;

    try {
      await api.delete(`/files/${fileId}`);
      fetchFiles();
    } catch (err) {
      console.error('删除文件失败:', err);
      error('删除文件失败，请重试');
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📎';
  };

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      const response = await api.get(`/files/download/${fileId}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('下载文件失败:', error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="files-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      <div className="page-header">
        <div>
          <h1>文件管理</h1>
          <p className="page-subtitle">上传、管理和下载您的文件</p>
        </div>
        <div className="page-header-actions">
          <div className="view-mode-toggle">
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
            >
              ⬜ 网格
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              ☰ 列表
            </button>
          </div>
        </div>
      </div>

      {/* 上传区域 */}
      <div className="files-upload-section">
        <FileUploader
          onUpload={handleFileUpload}
          maxSize={50 * 1024 * 1024}
          disabled={uploading}
        />
      </div>

      {/* 文件列表 */}
      <div className="files-list">
        {files.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <div className="empty-text">还没有文件，上传一个吧！</div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="files-grid">
            {files.map((file) => (
              <div key={file._id} className="file-card">
                <div className="file-icon">{getFileIcon(file.mimeType)}</div>
                <div className="file-info">
                  <div className="file-name" title={file.originalName}>
                    {file.originalName.length > 20
                      ? file.originalName.substring(0, 20) + '...'
                      : file.originalName}
                  </div>
                  <div className="file-meta">
                    <span>{formatBytes(file.size)}</span>
                    <span>•</span>
                    <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="file-actions">
                  <button
                    onClick={() => handleDownload(file._id, file.originalName)}
                    className="file-action-btn download"
                    title="下载"
                  >
                    ⬇️
                  </button>
                  <button
                    onClick={() => handleDeleteFile(file._id)}
                    className="file-action-btn delete"
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="files-table-container">
            <table className="files-table">
              <thead>
                <tr>
                  <th>文件名</th>
                  <th>大小</th>
                  <th>类型</th>
                  <th>上传时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file._id}>
                    <td>
                      <span className="file-icon-small">{getFileIcon(file.mimeType)}</span>
                      {file.originalName}
                    </td>
                    <td>{formatBytes(file.size)}</td>
                    <td>{file.mimeType}</td>
                    <td>{new Date(file.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="file-actions-inline">
                        <button
                          onClick={() => handleDownload(file._id, file.originalName)}
                          className="download-btn"
                        >
                          下载
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file._id)}
                          className="delete-btn"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {ConfirmDialogComponent}
    </div>
  );
};

export default Files;

