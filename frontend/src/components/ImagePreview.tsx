import { useEffect } from 'react';
import './ImagePreview.css';

interface ImagePreviewProps {
  imageUrl: string;
  onClose: () => void;
}

const ImagePreview = ({ imageUrl, onClose }: ImagePreviewProps) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  return (
    <div className="image-preview-overlay" onClick={onClose}>
      <div className="image-preview-content" onClick={(e) => e.stopPropagation()}>
        <button className="image-preview-close" onClick={onClose}>×</button>
        <img src={imageUrl} alt="预览" className="image-preview-img" />
      </div>
    </div>
  );
};

export default ImagePreview;

