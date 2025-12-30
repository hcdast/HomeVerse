import React, { useEffect, useState, useCallback, useMemo } from 'react';
import aiService, { AiProviderType, AiProviderInfo } from '../services/aiService';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import './AiProviderSelector.css';

interface AiProviderSelectorProps {
  value?: AiProviderType;
  onChange?: (provider: AiProviderType) => void;
  showOnlyConfigured?: boolean;
  compact?: boolean;
}

const AiProviderSelector: React.FC<AiProviderSelectorProps> = ({
  value,
  onChange,
  showOnlyConfigured = false,
  compact = false,
}) => {
  const [providers, setProviders] = useState<AiProviderInfo[]>([]);
  const [currentProvider, setCurrentProvider] = useState<AiProviderType | undefined>(value);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast, hideToast, success, warning, error: showError } = useToast();

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    setCurrentProvider(value);
  }, [value]);

  const loadProviders = useCallback(async () => {
    try {
      setError(null);
      const data = await aiService.getProviders();
      let providerList = data.providers;
      
      if (showOnlyConfigured) {
        providerList = providerList.filter(p => p.configured);
      }
      
      setProviders(providerList);
      if (!value) {
        setCurrentProvider(data.current);
      }
    } catch (error: any) {
      console.error('加载 AI 提供商失败:', error);
      setError(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [showOnlyConfigured, value]);

  const handleProviderChange = useCallback(async (providerType: AiProviderType) => {
    const provider = providers.find(p => p.type === providerType);
    
    if (!provider?.configured) {
      warning(`${provider?.name} 未配置，请先在后端设置相应的 API Key`);
      return;
    }

    setCurrentProvider(providerType);
    
    if (onChange) {
      onChange(providerType);
    } else {
      // 如果没有提供 onChange，则直接切换全局提供商
      try {
        await aiService.setProvider(providerType);
        success('AI 提供商切换成功');
      } catch (err: any) {
        console.error('切换 AI 提供商失败:', err);
        showError(err.response?.data?.message || '切换失败，请重试');
      }
    }
  }, [providers, onChange, warning, success, showError]);

  const getProviderIcon = useCallback((type: AiProviderType): string => {
    const icons: Record<AiProviderType, string> = {
      [AiProviderType.OPENAI]: '🤖',
      [AiProviderType.CLAUDE]: '🧠',
      [AiProviderType.GEMINI]: '💎',
      [AiProviderType.QWEN]: '🌟',
      [AiProviderType.CUSTOM]: '⚙️',
    };
    return icons[type] || '🤖';
  }, []);

  // 过滤后的提供商列表
  const filteredProviders = useMemo(() => {
    return showOnlyConfigured 
      ? providers.filter(p => p.configured)
      : providers;
  }, [providers, showOnlyConfigured]);

  if (loading) {
    return <div className="ai-provider-loading">加载中...</div>;
  }
  
  if (error) {
    return (
      <div className="ai-provider-error">
        <p>加载失败: {error}</p>
        <button onClick={loadProviders}>重试</button>
      </div>
    );
  }
  
  if (filteredProviders.length === 0) {
    return (
      <div className="ai-provider-empty">
        暂无可用的 AI 提供商，请在后端配置 API Key
      </div>
    );
  }

  if (compact) {
    return (
      <select
        className="ai-provider-select"
        value={currentProvider}
        onChange={(e) => handleProviderChange(e.target.value as AiProviderType)}
      >
        {filteredProviders.map((provider) => (
          <option 
            key={provider.type} 
            value={provider.type}
            disabled={!provider.configured}
          >
            {provider.name} {!provider.configured && '(未配置)'}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="ai-provider-selector">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      <div className="ai-provider-grid">
        {filteredProviders.map((provider) => (
          <div
            key={provider.type}
            className={`ai-provider-card ${currentProvider === provider.type ? 'active' : ''} ${
              !provider.configured ? 'disabled' : ''
            }`}
            onClick={() => handleProviderChange(provider.type)}
          >
            <div className="provider-icon">{getProviderIcon(provider.type)}</div>
            <div className="provider-info">
              <h4>{provider.name}</h4>
              <p className="provider-description">{provider.description}</p>
              <div className="provider-status">
                {provider.configured ? (
                  <span className="status-badge configured">✓ 已配置</span>
                ) : (
                  <span className="status-badge not-configured">未配置</span>
                )}
              </div>
              <div className="provider-models">
                <small>{provider.models.length} 个模型可用</small>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AiProviderSelector;

