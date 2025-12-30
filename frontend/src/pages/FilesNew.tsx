import { useEffect, useState } from 'react';
import api from '@/services/api';
import FileUploader from '@/components/FileUploader';
import Loading from '@/components/Loading';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './Files.css';

interface FileItem {
  _id: string;
  originalName: string;
  size: number;
  mimeType: string;
  folder: string;
  createdAt: string;
  uploadedBy?: {
    username: string;
    avatar?: string;
  };
}

interface FolderContents {
  currentPath: string;
  files: FileItem[];
  subfolders: string[];
}

const FilesNew = () => {
  const [folderContents, setFolderContents] = useState<FolderContents>({
    currentPath: '/',
    files: [],
    subfolders: [],
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const { toast, hideToast, error } = useToast();
  // const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFolderContents(folderContents.currentPath);
  }, []);

  // 加载文件夹内容
  const loadFolderContents = async (path: string) => {
    try {
      setLoading(true);
      const response = await api.get('/files/folders/contents', {
        params: { path },
      });
      setFolderContents(response.data);
    } catch (error) {
      console.error('加载文件夹失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 导航到文件夹
  const navigateToFolder = (folderName: string) => {
    const newPath = folderContents.currentPath === '/' 
      ? `/${folderName}` 
      : `${folderContents.currentPath}/${folderName}`;
    loadFolderContents(newPath);
  };

  // 返回上级目录
  const navigateUp = () => {
    if (folderContents.currentPath === '/') return;
    const parts = folderContents.currentPath.split('/').filter(p => p);
    parts.pop();
    const newPath = parts.length === 0 ? '/' : '/' + parts.join('/');
    loadFolderContents(newPath);
  };

  // 导航到路径
  const navigateToPath = (index: number) => {
    const parts = folderContents.currentPath.split('/').filter(p => p);
    if (index === -1) {
      loadFolderContents('/');
    } else {
      const newPath = '/' + parts.slice(0, index + 1).join('/');
      loadFolderContents(newPath);
    }
  };

  // 创建文件夹
  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await api.post('/files/folders', {
        folderName: newFolderName.trim(),
        parentPath: folderContents.currentPath,
      });
      setShowNewFolderDialog(false);
      setNewFolderName('');
      loadFolderContents(folderContents.currentPath);
    } catch (err: any) {
      console.error('创建文件夹失败:', err);
      error(err.response?.data?.message || '创建文件夹失败');
    }
  };

  // 上传文件
  const handleFileUpload = async (file: globalThis.File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file as Blob);
    formData.append('folder', folderContents.currentPath);

    try {
      await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      loadFolderContents(folderContents.currentPath);
    } catch (err: any) {
      console.error('上传文件失败:', err);
      error(err.response?.data?.message || '上传文件失败');
    } finally {
      setUploading(false);
    }
  };

  // 下载文件
  const downloadFile = (fileId: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = `/api/files/download/${fileId}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 删除文件
  const deleteFile = async (fileId: string) => {
    if (!confirm('确定要删除这个文件吗？')) return;
    try {
      await api.delete(`/files/${fileId}`);
      loadFolderContents(folderContents.currentPath);
    } catch (err) {
      console.error('删除文件失败:', err);
      error('删除文件失败');
    }
  };

  // 删除文件夹
  const deleteFolder = async (folderName: string) => {
    if (!confirm('确定要删除这个文件夹及其所有内容吗？')) return;
    const folderPath = folderContents.currentPath === '/' 
      ? `/${folderName}` 
      : `${folderContents.currentPath}/${folderName}`;
    try {
      await api.delete('/files/folders', {
        params: { path: folderPath },
      });
      loadFolderContents(folderContents.currentPath);
    } catch (err) {
      console.error('删除文件夹失败:', err);
      error('删除文件夹失败');
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // 格式化时间
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // 获取文件图标
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📄';
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed')) return '📦';
    return '📄';
  };

  // 面包屑导航
  const pathParts = folderContents.currentPath.split('/').filter(p => p);

  if (loading) return <Loading />;

  return (
    <div className="files-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      <div className="files-header">
        <h1>文件管理</h1>
        <div className="header-actions">
          <button onClick={() => setShowNewFolderDialog(true)} className="btn-secondary">
            📁 新建文件夹
          </button>
          <FileUploader onUpload={handleFileUpload} disabled={uploading} />
          <div className="view-toggle">
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              title="网格视图"
            >
              ▦
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              title="列表视图"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* 面包屑导航 */}
      <div className="breadcrumb">
        <button onClick={() => navigateToPath(-1)} className="breadcrumb-item">
          🏠 根目录
        </button>
        {pathParts.map((part, index) => (
          <span key={index}>
            <span className="breadcrumb-separator">/</span>
            <button
              onClick={() => navigateToPath(index)}
              className="breadcrumb-item"
            >
              {part}
            </button>
          </span>
        ))}
      </div>

      {/* 返回按钮 */}
      {folderContents.currentPath !== '/' && (
        <button onClick={navigateUp} className="back-button">
          ← 返回上级
        </button>
      )}

      {/* 文件夹和文件列表 */}
      <div className={`files-container ${viewMode}`}>
        {/* 子文件夹 */}
        {folderContents.subfolders.map((folder) => (
          <div key={folder} className="file-item folder-item">
            <div className="file-icon">📁</div>
            <div className="file-info">
              <h3 className="file-name" onClick={() => navigateToFolder(folder)}>
                {folder}
              </h3>
              <div className="file-meta">文件夹</div>
            </div>
            <div className="file-actions">
              <button onClick={() => deleteFolder(folder)} className="delete-btn" title="删除">
                🗑️
              </button>
            </div>
          </div>
        ))}

        {/* 文件 */}
        {folderContents.files.map((file) => (
          <div key={file._id} className="file-item">
            <div className="file-icon">{getFileIcon(file.mimeType)}</div>
            <div className="file-info">
              <h3 className="file-name">{file.originalName}</h3>
              <div className="file-meta">
                <span>{formatFileSize(file.size)}</span>
                <span>{formatDate(file.createdAt)}</span>
                {file.uploadedBy && <span>上传者: {file.uploadedBy.username}</span>}
              </div>
            </div>
            <div className="file-actions">
              <button
                onClick={() => downloadFile(file._id, file.originalName)}
                className="download-btn"
                title="下载"
              >
                ⬇️
              </button>
              <button onClick={() => deleteFile(file._id)} className="delete-btn" title="删除">
                🗑️
              </button>
            </div>
          </div>
        ))}

        {folderContents.subfolders.length === 0 && folderContents.files.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <p>这个文件夹是空的</p>
            <p className="empty-hint">上传文件或创建新文件夹</p>
          </div>
        )}
      </div>

      {/* 新建文件夹对话框 */}
      {showNewFolderDialog && (
        <div className="modal-overlay" onClick={() => setShowNewFolderDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>新建文件夹</h2>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="文件夹名称"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && createFolder()}
            />
            <div className="modal-actions">
              <button onClick={() => setShowNewFolderDialog(false)} className="btn-secondary">
                取消
              </button>
              <button onClick={createFolder} className="btn-primary">
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilesNew;

