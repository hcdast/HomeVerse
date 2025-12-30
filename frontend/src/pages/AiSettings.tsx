import { useEffect, useState } from 'react';
import AiProviderSelector from '@/components/AiProviderSelector';
import aiService, { AiProviderType } from '@/services/aiService';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import './AiSettings.css';

const AiSettings = () => {
  const [currentProvider, setCurrentProvider] = useState<AiProviderType | undefined>();
  const [loading, setLoading] = useState(true);
  const { toast, hideToast, success, error } = useToast();

  useEffect(() => {
    loadCurrentProvider();
  }, []);

  const loadCurrentProvider = async () => {
    try {
      const data = await aiService.getProviders();
      setCurrentProvider(data.current);
    } catch (error) {
      console.error('加载 AI 设置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = async (provider: AiProviderType) => {
    try {
      await aiService.setProvider(provider);
      setCurrentProvider(provider);
      success('AI 提供商切换成功！');
    } catch (err) {
      console.error('切换 AI 提供商失败:', err);
      error('切换失败，请重试');
    }
  };

  if (loading) {
    return (
      <div className="ai-settings-page">
        <div className="page-header">
          <h1>AI 设置</h1>
          <p className="page-subtitle">配置和管理 AI 提供商</p>
        </div>
        <div className="loading-state">加载中...</div>
      </div>
    );
  }

  return (
    <div className="ai-settings-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      <div className="page-header">
        <h1>AI 设置</h1>
        <p className="page-subtitle">配置和管理 AI 提供商</p>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h2>选择默认 AI 提供商</h2>
          <p className="section-description">
            选择一个 AI 提供商作为默认使用。所有未指定提供商的 AI 功能将使用此默认设置。
          </p>
          <AiProviderSelector
            value={currentProvider}
            onChange={handleProviderChange}
          />
        </div>

        <div className="settings-section">
          <h2>配置说明</h2>
          <div className="config-guide">
            <div className="guide-item">
              <h3>🤖 OpenAI</h3>
              <p>在后端 <code>.env</code> 文件中配置：</p>
              <pre>
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
              </pre>
            </div>

            <div className="guide-item">
              <h3>🧠 Claude (Anthropic)</h3>
              <p>在后端 <code>.env</code> 文件中配置：</p>
              <pre>
CLAUDE_API_KEY=your_api_key_here
CLAUDE_MODEL=claude-3-5-sonnet-20241022
              </pre>
            </div>

            <div className="guide-item">
              <h3>💎 Gemini (Google)</h3>
              <p>在后端 <code>.env</code> 文件中配置：</p>
              <pre>
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-pro
              </pre>
            </div>

            <div className="guide-item">
              <h3>🌟 通义千问 (阿里云)</h3>
              <p>在后端 <code>.env</code> 文件中配置：</p>
              <pre>
QWEN_API_KEY=your_api_key_here
QWEN_MODEL=qwen-turbo
              </pre>
            </div>
          </div>

          <div className="config-note">
            <h4>⚠️ 注意事项</h4>
            <ul>
              <li>配置后需要重启后端服务才能生效</li>
              <li>可以同时配置多个提供商，在使用时随时切换</li>
              <li>确保 API Key 有足够的配额和权限</li>
              <li>如需使用代理，请在 .env 中配置 <code>HTTPS_PROXY</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiSettings;

