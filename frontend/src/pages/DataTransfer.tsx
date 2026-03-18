import { useState, useRef } from 'react';
import api from '../services/api';
import './DataTransfer.css';

interface Module {
  id: string;
  name: string;
  icon: string;
}

interface ImportResult {
  module: string;
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

const DataTransfer = () => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'backup'>('export');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modules: Module[] = [
    { id: 'albums', name: '相册', icon: '📷' },
    { id: 'articles', name: '文章', icon: '📝' },
    { id: 'todos', name: '待办', icon: '✅' },
    { id: 'finances', name: '财务', icon: '💰' },
    { id: 'recipes', name: '食谱', icon: '🍳' },
    { id: 'calendars', name: '日历', icon: '📅' },
    { id: 'contacts', name: '联系人', icon: '📞' },
    { id: 'healths', name: '健康', icon: '🏥' },
    { id: 'shoppings', name: '购物', icon: '🛒' },
    { id: 'chores', name: '家务', icon: '🧹' },
    { id: 'budgets', name: '预算', icon: '📊' },
    { id: 'goals', name: '目标', icon: '🎯' },
    { id: 'travels', name: '旅行', icon: '✈️' },
  ];

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const selectAll = () => {
    setSelectedModules(modules.map(m => m.id));
  };

  const deselectAll = () => {
    setSelectedModules([]);
  };

  // 导出数据
  const handleExport = async () => {
    if (selectedModules.length === 0) {
      alert('请选择要导出的模块');
      return;
    }

    try {
      setExporting(true);
      const response = await api.post('/data-transfer/export', {
        modules: selectedModules,
        format: exportFormat,
      }, {
        responseType: 'blob',
      });

      // 下载文件
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `homeverse-export-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert('导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  // 备份所有数据
  const handleBackup = async () => {
    try {
      setExporting(true);
      const response = await api.get('/data-transfer/backup', {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `homeverse-backup-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert('备份成功！');
    } catch (error) {
      console.error('备份失败:', error);
      alert('备份失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  // 导入数据
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setImportResults(null);

      const content = await file.text();
      const data = JSON.parse(content);

      if (data.data) {
        // 这是备份文件，恢复所有数据
        const response = await api.post('/data-transfer/restore', data);
        const results = Object.values(response.data) as ImportResult[];
        setImportResults(results);
      } else {
        alert('无效的导入文件格式');
      }
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败，请检查文件格式');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="data-transfer-page">
      <div className="page-header">
        <h1>📦 数据管理</h1>
        <p>导入、导出和备份您的家庭数据</p>
      </div>

      {/* 标签页 */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          📤 导出数据
        </button>
        <button
          className={`tab ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          📥 导入数据
        </button>
        <button
          className={`tab ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveTab('backup')}
        >
          💾 备份恢复
        </button>
      </div>

      {/* 导出面板 */}
      {activeTab === 'export' && (
        <div className="panel">
          <h2>选择要导出的模块</h2>
          <div className="selection-actions">
            <button onClick={selectAll}>全选</button>
            <button onClick={deselectAll}>取消全选</button>
            <span className="selection-count">已选择 {selectedModules.length} 个模块</span>
          </div>

          <div className="modules-grid">
            {modules.map(module => (
              <div
                key={module.id}
                className={`module-card ${selectedModules.includes(module.id) ? 'selected' : ''}`}
                onClick={() => toggleModule(module.id)}
              >
                <span className="module-icon">{module.icon}</span>
                <span className="module-name">{module.name}</span>
                <span className="check-mark">✓</span>
              </div>
            ))}
          </div>

          <div className="export-options">
            <label>导出格式：</label>
            <select value={exportFormat} onChange={e => setExportFormat(e.target.value as 'json' | 'csv')}>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </div>

          <button
            className="action-button primary"
            onClick={handleExport}
            disabled={exporting || selectedModules.length === 0}
          >
            {exporting ? '导出中...' : '📤 导出选中模块'}
          </button>
        </div>
      )}

      {/* 导入面板 */}
      {activeTab === 'import' && (
        <div className="panel">
          <h2>导入数据</h2>
          <div className="import-area">
            <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
              <span className="upload-icon">📁</span>
              <p>点击选择文件或拖拽文件到此处</p>
              <span className="upload-hint">支持 JSON 格式的导出文件或备份文件</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </div>

          {importing && (
            <div className="importing-status">
              <div className="spinner" />
              <p>正在导入数据...</p>
            </div>
          )}

          {importResults && (
            <div className="import-results">
              <h3>导入结果</h3>
              {importResults.map((result, index) => (
                <div key={index} className={`result-item ${result.failed > 0 ? 'has-errors' : 'success'}`}>
                  <div className="result-header">
                    <span className="result-module">{result.module}</span>
                    <span className="result-stats">
                      成功 {result.success} / 总计 {result.total}
                    </span>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="result-errors">
                      {result.errors.map((err, i) => (
                        <p key={i}>{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 备份恢复面板 */}
      {activeTab === 'backup' && (
        <div className="panel">
          <h2>备份与恢复</h2>
          
          <div className="backup-section">
            <div className="backup-card">
              <span className="backup-icon">💾</span>
              <h3>创建完整备份</h3>
              <p>备份所有家庭数据，包括相册、文章、待办、财务等所有模块</p>
              <button
                className="action-button primary"
                onClick={handleBackup}
                disabled={exporting}
              >
                {exporting ? '备份中...' : '创建备份'}
              </button>
            </div>

            <div className="backup-card">
              <span className="backup-icon">📥</span>
              <h3>恢复数据</h3>
              <p>从备份文件恢复数据，将会合并到现有数据中</p>
              <button
                className="action-button"
                onClick={() => setActiveTab('import')}
              >
                选择备份文件
              </button>
            </div>
          </div>

          <div className="backup-tips">
            <h4>💡 备份建议</h4>
            <ul>
              <li>建议每月进行一次完整备份</li>
              <li>重要数据变更后及时备份</li>
              <li>备份文件请妥善保管，不要分享给他人</li>
              <li>恢复数据时会合并到现有数据，不会覆盖</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTransfer;



