import { useRef, useState } from 'react';
import './FileUploader.css';

interface FileUploaderProps {
  onUpload?: (file: globalThis.File) => void;
  onUploadMultiple?: (files: globalThis.File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // 字节
  maxFiles?: number; // 最大文件数量
  disabled?: boolean;
  children?: React.ReactNode;
}

const FileUploader = ({
  onUpload,
  onUploadMultiple,
  accept,
  multiple = false,
  maxSize,
  maxFiles = 100,
  disabled = false,
  children,
}: FileUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // 检查文件数量
    if (multiple && fileArray.length > maxFiles) {
      setError(`最多只能上传 ${maxFiles} 个文件`);
      return;
    }
    
    // 检查文件大小
    const oversizedFiles = fileArray.filter(file => maxSize && file.size > maxSize);
    if (oversizedFiles.length > 0) {
      if (multiple) {
        setError(`${oversizedFiles.length} 个文件超过大小限制 ${formatBytes(maxSize!)}`);
      } else {
        setError(`文件大小不能超过 ${formatBytes(maxSize!)}`);
      }
      return;
    }

    setError('');
    
    // 多文件上传模式
    if (multiple && onUploadMultiple) {
      onUploadMultiple(fileArray);
    } else if (onUpload) {
      // 单文件上传模式
      onUpload(fileArray[0]);
    }
    
    // 重置 input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="file-uploader">
      <div
        className={`file-uploader-dropzone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFileSelect(e.target.files)}
          style={{ display: 'none' }}
          disabled={disabled}
        />
        {children || (
          <div className="file-uploader-content">
            <div className="file-uploader-icon">📤</div>
            <div className="file-uploader-text">
              {isDragging ? '松开以上传文件' : '点击或拖拽文件到此处上传'}
            </div>
            {maxSize && (
              <div className="file-uploader-hint">
                最大文件大小: {formatBytes(maxSize)}
              </div>
            )}
          </div>
        )}
      </div>
      {error && <div className="file-uploader-error">{error}</div>}
    </div>
  );
};

export default FileUploader;

