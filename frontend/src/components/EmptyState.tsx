import React from 'react';

interface EmptyStateProps {
  /** 图标（emoji 或字符） */
  icon?: string;
  /** 标题/简短说明 */
  title?: string;
  /** 补充说明 */
  description?: string;
  /** 主操作按钮文案 */
  actionLabel?: string;
  /** 主操作点击 */
  onAction?: () => void;
  /** 自定义样式 */
  style?: React.CSSProperties;
  className?: string;
}

const defaultIcon = '📭';
const defaultTitle = '暂无数据';
const defaultDescription = '';

/**
 * 统一空状态：图标 + 说明 + 主操作，用于列表无数据时引导用户
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon = defaultIcon,
  title = defaultTitle,
  description = defaultDescription,
  actionLabel,
  onAction,
  style,
  className = '',
}) => (
  <div
    className={`empty-state ${className}`}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 48,
      minHeight: 200,
      color: 'var(--color-text-tertiary, #999)',
      ...style,
    }}
  >
    <span style={{ fontSize: 48, marginBottom: 16, lineHeight: 1 }}>{icon}</span>
    <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-secondary, #666)', marginBottom: 8 }}>
      {title}
    </div>
    {description && (
      <div style={{ fontSize: 14, marginBottom: 16, maxWidth: 320, textAlign: 'center' }}>{description}</div>
    )}
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        style={{
          marginTop: 8,
          padding: '8px 20px',
          borderRadius: 8,
          border: 'none',
          background: 'var(--gradient-primary, linear-gradient(135deg, #667eea 0%, #764ba2 100%))',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export default EmptyState;
