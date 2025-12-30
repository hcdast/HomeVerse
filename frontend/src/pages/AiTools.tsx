import { useState, useEffect } from 'react';
import aiToolsService, { AiToolType, ImageModel, Image2ImageModel, VideoModel } from '../services/aiToolsService';
import { useToast } from '../hooks/useToast';
import useConfirm from '../hooks/useConfirm';
import './AiTools.css';

const AiTools = () => {
  const [activeTab, setActiveTab] = useState<AiToolType>(AiToolType.TEXT_TO_IMAGE);
  const [loading, setLoading] = useState(false);
  const { success, error, info } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirm();

  // 任务管理
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [taskHistory, setTaskHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // 筛选状态
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterModel, setFilterModel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Text to Image 状态
  const [textPrompt, setTextPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [imageModel, setImageModel] = useState<ImageModel>(ImageModel.FLUX_2_FLEX);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  // Image to Image 状态
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [i2iPrompt, setI2iPrompt] = useState('');
  const [i2iModel, setI2iModel] = useState<Image2ImageModel>(Image2ImageModel.FLUX_KONTEXT_PRO);

  // Video 状态
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoModel, setVideoModel] = useState<VideoModel>(VideoModel.SEEDANCE_PRO_T2V_480P);
  const [videoImage, setVideoImage] = useState<File | null>(null);
  const [_generatedVideos, setGeneratedVideos] = useState<string[]>([]); // TODO: 在UI中展示生成的视频

  // ChatGPT Agent 状态
  const [agentPrompt, setAgentPrompt] = useState('');
  const [agentMessages, setAgentMessages] = useState<any[]>([]);

  useEffect(() => {
    loadTaskHistory();
    
    // 每30秒自动刷新任务历史
    const refreshInterval = setInterval(() => {
      loadTaskHistory();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, []);

  // 图像转换
  const handleImageToImage = async () => {
    if (!sourceImage) {
      error('请先上传图像');
      return;
    }

    setLoading(true);
    setCurrentTaskId(null);
    
    try {
      const result = await aiToolsService.imageToImage({
        image: sourceImage,
        prompt: i2iPrompt || undefined,
        model: i2iModel,
        negativePrompt: negativePrompt || undefined,
      });

      await loadTaskHistory();

      if (result.success) {
        const ourTaskId = result.taskId;
        
        if (ourTaskId) {
          setCurrentTaskId(ourTaskId);
        }
        
        if (result.data?.imageUrls && result.data.imageUrls.length > 0) {
          setGeneratedImages(result.data.imageUrls);
          success('图像转换成功！');
          await loadTaskHistory();
        } else if (ourTaskId) {
          success('转换任务已提交，正在处理...');
          pollTaskStatus(ourTaskId);
        }
      }
    } catch (err: any) {
      error(err.message);
      await loadTaskHistory();
    } finally {
      setLoading(false);
    }
  };

  // 文本生成视频
  const handleTextToVideo = async () => {
    if (!videoPrompt.trim()) {
      error('请输入提示词');
      return;
    }

    setLoading(true);
    setCurrentTaskId(null);
    
    try {
      const result = await aiToolsService.textToVideo({
        prompt: videoPrompt,
        model: videoModel,
        duration: 5,
        fps: 24,
      });

      await loadTaskHistory();

      if (result.success) {
        const ourTaskId = result.taskId;
        
        if (ourTaskId) {
          setCurrentTaskId(ourTaskId);
        }
        
        if (result.data?.videoUrl) {
          setGeneratedVideos([result.data.videoUrl]);
          success('视频生成成功！');
          await loadTaskHistory();
        } else if (ourTaskId) {
          success('视频生成任务已提交，预计需要1-3分钟...');
          pollTaskStatus(ourTaskId);
        }
      }
    } catch (err: any) {
      error(err.message);
      await loadTaskHistory();
    } finally {
      setLoading(false);
    }
  };

  // 图像生成视频
  const handleImageToVideo = async () => {
    if (!videoImage) {
      error('请先上传图像');
      return;
    }

    setLoading(true);
    setCurrentTaskId(null);
    
    try {
      const result = await aiToolsService.imageToVideo({
        image: videoImage,
        prompt: videoPrompt || undefined,
        model: videoModel,
        duration: 5,
        motionStrength: 0.5,
      });

      await loadTaskHistory();

      if (result.success) {
        const ourTaskId = result.taskId;
        
        if (ourTaskId) {
          setCurrentTaskId(ourTaskId);
        }
        
        if (result.data?.videoUrl) {
          setGeneratedVideos([result.data.videoUrl]);
          success('视频生成成功！');
          await loadTaskHistory();
        } else if (ourTaskId) {
          success('视频生成任务已提交...');
          pollTaskStatus(ourTaskId);
        }
      }
    } catch (err: any) {
      error(err.message);
      await loadTaskHistory();
    } finally {
      setLoading(false);
    }
  };

  // ChatGPT Agent 对话
  const handleAgentChat = async () => {
    if (!agentPrompt.trim()) {
      error('请输入消息');
      return;
    }

    setLoading(true);
    
    try {
      const result = await aiToolsService.chatAgent({
        prompt: agentPrompt,
      });

      if (result.success && result.data?.response) {
        const newMessages = [
          ...agentMessages,
          { role: 'user', content: agentPrompt },
          { role: 'assistant', content: result.data.response },
        ];
        setAgentMessages(newMessages);
        setAgentPrompt('');
        success('回复成功');
      }
    } catch (err: any) {
      error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTaskHistory = async () => {
    try {
      const params: any = { limit: 50 };
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      
      const result = await aiToolsService.getMyTasks(params);
      if (result.success) {
        let tasks = result.tasks || [];
        
        // 前端筛选（按服务商和模型）
        if (filterProvider !== 'all') {
          tasks = tasks.filter((t: any) => 
            getProviderFromModel(t.params?.model) === filterProvider
          );
        }
        
        if (filterModel !== 'all') {
          tasks = tasks.filter((t: any) => t.params?.model === filterModel);
        }
        
        setTaskHistory(tasks);
        console.log('任务历史已刷新，共', tasks.length, '个任务');
      }
    } catch (err: any) {
      console.error('加载任务历史失败:', err);
    }
  };
  
  // 删除任务
  const handleDeleteTask = async (taskId: string) => {
    const confirmed = await confirm({
      title: '删除任务',
      message: '确定要删除这个任务记录吗？',
      confirmText: '删除',
      type: 'danger',
    });
    if (!confirmed) return;
    
    try {
      await aiToolsService.deleteTask(taskId);
      success('任务已删除');
      await loadTaskHistory();
    } catch (err: any) {
      error(err.message);
    }
  };
  
  // 从模型名获取服务商
  const getProviderFromModel = (model: string): string => {
    if (!model) return 'unknown';
    if (model.includes('wavespeed-ai')) return 'Wavespeed';
    if (model.includes('bytedance')) return 'ByteDance';
    if (model.includes('google')) return 'Google';
    if (model.includes('openai')) return 'OpenAI';
    if (model.includes('alibaba')) return 'Alibaba';
    if (model.includes('kwaivgi')) return 'Kuaishou';
    if (model.includes('MiniMax')) return 'MiniMax';
    return 'Unknown';
  };
  
  // 获取唯一的服务商列表
  const getUniqueProviders = () => {
    const providers = new Set(taskHistory.map(t => getProviderFromModel(t.params?.model)));
    return Array.from(providers).sort();
  };
  
  // 获取唯一的模型列表
  const getUniqueModels = () => {
    const models = new Set(taskHistory.map(t => t.params?.model).filter(Boolean));
    return Array.from(models).sort();
  };

  // 文本生成图像
  const handleTextToImage = async () => {
    if (!textPrompt.trim()) {
      error('请输入提示词');
      return;
    }

    setLoading(true);
    setCurrentTaskId(null);
    
    try {
      const result = await aiToolsService.textToImage({
        prompt: textPrompt,
        model: imageModel,
        negativePrompt: negativePrompt || undefined,
        width: 1024,
        height: 1024,
      });

      // 立即刷新任务历史（无论成功或失败）
      await loadTaskHistory();

      if (result.success) {
        // 使用返回的 taskId（我们的任务ID，不是 Wavespeed 的）
        const ourTaskId = result.taskId;
        
        if (ourTaskId) {
          setCurrentTaskId(ourTaskId);
        }
        
        // 如果直接返回了图像（同步）
        if (result.data?.imageUrls && result.data.imageUrls.length > 0) {
          setGeneratedImages(result.data.imageUrls);
          success('图像生成成功！');
          await loadTaskHistory();
        } 
        // 如果是异步任务，开始轮询
        else if (ourTaskId) {
          success('任务已提交，正在生成...');
          // 使用我们的 taskId 轮询
          pollTaskStatus(ourTaskId);
        }
      }
    } catch (err: any) {
      error(err.message);
      // 即使失败也刷新历史，显示失败的任务
      await loadTaskHistory();
    } finally {
      setLoading(false);
    }
  };

  // 轮询任务状态（Wavespeed 异步任务）
  const pollTaskStatus = (taskId: string | undefined) => {
    // 检查 taskId 是否有效
    if (!taskId) {
      console.error('❌ 无法轮询：taskId 为空');
      error('任务创建失败，请重试');
      setLoading(false);
      return;
    }
    console.log(`🔄 开始轮询任务: ${taskId}`);
    
    const maxAttempts = 120; // 最多6分钟（120次 x 3秒）
    let attempts = 0;
    let lastStatus = '';

    const interval = setInterval(async () => {
      attempts++;
      
      if (attempts > maxAttempts) {
        clearInterval(interval);
        console.error(`❌ 任务轮询超时: ${taskId} (${attempts}次尝试)`);
        error('任务超时，请稍后在任务历史中查看结果');
        setCurrentTaskId(null);
        await loadTaskHistory();
        return;
      }

      try {
        // 带 checkRemote 参数，让后端查询 Wavespeed 的实时状态
        const result = await aiToolsService.getTaskDetail(taskId, true);
        
        if (result.success && result.task) {
          const task = result.task;
          
          // 只在状态变化时输出日志
          if (task.status !== lastStatus) {
            console.log(`📊 任务状态更新: ${taskId} -> ${task.status} (第${attempts}次轮询)`);
            lastStatus = task.status;
          }
          
          // 每10次轮询刷新一次历史
          if (attempts % 10 === 0) {
            await loadTaskHistory();
          }
          
          if (task.status === 'completed') {
            clearInterval(interval);
            setCurrentTaskId(null);
            
            console.log(`✅ 任务完成: ${taskId}`, task.result);
            
            // 更新结果到界面
            if (task.result?.imageUrls && task.result.imageUrls.length > 0) {
              setGeneratedImages(task.result.imageUrls);
              success(`图像生成完成！共 ${task.result.imageUrls.length} 张`);
              console.log('🖼️ 图像URLs:', task.result.imageUrls);
            } else if (task.result?.videoUrl) {
              setGeneratedVideos([task.result.videoUrl]);
              success('视频生成完成！');
              console.log('🎬 视频URL:', task.result.videoUrl);
            } else {
              success('任务已完成');
              console.warn('⚠️ 任务完成但没有结果数据');
            }
            
            await loadTaskHistory();
          } else if (task.status === 'failed') {
            clearInterval(interval);
            setCurrentTaskId(null);
            console.error(`❌ 任务失败: ${taskId}`, task.errorMessage);
            error(task.errorMessage || '任务失败');
            await loadTaskHistory();
          } else {
            // 还在处理中，继续轮询
            if (attempts % 20 === 0) {
              console.log(`⏳ 任务仍在处理中... (已等待 ${attempts * 3} 秒)`);
            }
          }
        }
      } catch (err: any) {
        console.error(`⚠️ 轮询错误 (第${attempts}次):`, err.message);
        
        // 如果连续失败5次，停止轮询
        if (attempts > 5 && attempts % 5 === 0) {
          console.error('连续轮询失败，请检查网络或后端服务');
        }
      }
    }, 3000); // 每3秒轮询一次
  };

  const toolTabs = [
    { type: AiToolType.TEXT_TO_IMAGE, name: '文本生成图像', icon: '🎨' },
    { type: AiToolType.IMAGE_TO_IMAGE, name: '图像转换', icon: '🖼️' },
    { type: AiToolType.TEXT_TO_VIDEO, name: '文本生成视频', icon: '🎬' },
    { type: AiToolType.IMAGE_TO_VIDEO, name: '图像生成视频', icon: '🎥' },
    { type: AiToolType.CHAT_AGENT, name: 'ChatGPT Agent', icon: '🤖' },
  ];

  return (
    <div className="ai-tools-page">
      <div className="page-header">
        <div>
          <h1>AI 创作工具</h1>
          <p className="page-subtitle">强大的 AI 工具助力创作</p>
        </div>
      </div>

      {/* 工具标签页 */}
      <div className="tool-tabs">
        {toolTabs.map((tab) => (
          <button
            key={tab.type}
            className={`tool-tab ${activeTab === tab.type ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.type)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-name">{tab.name}</span>
          </button>
        ))}
      </div>

      {/* 工具内容区 */}
      <div className="tool-content">
        {/* 文本生成图像 */}
        {activeTab === AiToolType.TEXT_TO_IMAGE && (
          <div className="tool-panel">
            <h2>🎨 文本生成图像</h2>
            <p className="tool-description">
              使用 SeeDream 4.0 或 DALL-E 3 从文本描述生成精美图像
            </p>

            <div className="form-group">
              <label>选择模型</label>
              <select 
                value={imageModel} 
                onChange={(e) => setImageModel(e.target.value as ImageModel)}
                className="model-select"
              >
                <optgroup label="Wavespeed Flux 系列（推荐）">
                  <option value={ImageModel.FLUX_2_FLEX}>⚡ Flux 2 Flex - 快速经济</option>
                  <option value={ImageModel.FLUX_2_PRO}>💎 Flux 2 Pro - 专业质量</option>
                  <option value={ImageModel.FLUX_11_PRO_ULTRA}>👑 Flux 1.1 Pro Ultra - 顶级质量</option>
                </optgroup>
                <optgroup label="ByteDance SeeDream">
                  <option value={ImageModel.SEEDREAM_4}>🎨 SeeDream 4.0 - 高质量</option>
                </optgroup>
                <optgroup label="Google">
                  <option value={ImageModel.GOOGLE_NANO_BANANA}>🍌 Nano Banana</option>
                </optgroup>
                <optgroup label="OpenAI">
                  <option value={ImageModel.OPENAI_GPT_IMAGE}>🤖 GPT Image 1</option>
                </optgroup>
              </select>
              <p className="model-hint">推荐使用 Flux 2 Flex，速度快且经济</p>
            </div>

            <div className="form-group">
              <label>提示词 *</label>
              <textarea
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                placeholder="描述您想要生成的图像，例如：一只可爱的小猫在花园里玩耍，油画风格，高质量"
                rows={4}
              />
            </div>

            <div className="form-group">
              <label>负面提示词（可选）</label>
              <textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="不想要的元素，例如：低质量、模糊、变形"
                rows={2}
              />
            </div>

            <button 
              onClick={handleTextToImage} 
              disabled={loading || !textPrompt.trim()}
              className="generate-btn"
            >
              {loading ? '🔄 生成中...' : '🎨 生成图像'}
            </button>

            {generatedImages.length > 0 && (
              <div className="results">
                <h3>生成结果</h3>
                <div className="image-grid">
                  {generatedImages.map((url, index) => (
                    <div key={index} className="image-item">
                      <img src={url} alt={`Generated ${index + 1}`} />
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="download-btn"
                      >
                        下载
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="info-box">
              <h4>💡 使用提示</h4>
              <ul>
                <li>详细描述想要的图像内容</li>
                <li>包含风格、色调、质量等关键词</li>
                <li>使用负面提示词排除不想要的元素</li>
                <li>SeeDream 4.0 生成速度更快</li>
              </ul>
            </div>
          </div>
        )}

        {/* 图像转换 */}
        {activeTab === AiToolType.IMAGE_TO_IMAGE && (
          <div className="tool-panel">
            <h2>🖼️ 图像转换</h2>
            <p className="tool-description">上传图像并通过提示词进行风格转换和编辑</p>

            <div className="form-group">
              <label>选择模型</label>
              <select 
                value={i2iModel} 
                onChange={(e) => setI2iModel(e.target.value as Image2ImageModel)}
                className="model-select"
              >
                <optgroup label="Wavespeed Flux 系列（推荐）">
                  <option value={Image2ImageModel.FLUX_KONTEXT_PRO}>Flux Kontext Pro（智能编辑）</option>
                  <option value={Image2ImageModel.FLUX_2_FLEX_EDIT}>Flux 2 Flex Edit（快速）</option>
                  <option value={Image2ImageModel.FLUX_2_PRO_EDIT}>Flux 2 Pro Edit（高质量）</option>
                </optgroup>
                <optgroup label="ByteDance">
                  <option value={Image2ImageModel.SEEDREAM_4_EDIT}>SeeDream 4.0 Edit</option>
                </optgroup>
                <optgroup label="Google">
                  <option value={Image2ImageModel.GOOGLE_NANO_BANANA_EDIT}>Nano Banana Edit</option>
                  <option value={Image2ImageModel.GOOGLE_NANO_BANANA_PRO_EDIT}>Nano Banana Pro Edit</option>
                </optgroup>
                <optgroup label="Qwen">
                  <option value={Image2ImageModel.QWEN_IMAGE_EDIT}>Qwen Image Edit Plus</option>
                </optgroup>
              </select>
            </div>

            <div className="form-group">
              <label>上传图像 *</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSourceImage(e.target.files?.[0] || null)}
                className="file-input"
              />
              {sourceImage && (
                <div className="preview">
                  <img src={URL.createObjectURL(sourceImage)} alt="Source" />
                  <p className="file-name">{sourceImage.name}</p>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>转换提示词</label>
              <textarea
                value={i2iPrompt}
                onChange={(e) => setI2iPrompt(e.target.value)}
                placeholder="描述想要的转换效果，例如：转换成油画风格、添加光晕效果"
                rows={3}
              />
            </div>

            <button 
              onClick={handleImageToImage}
              disabled={loading || !sourceImage}
              className="generate-btn"
            >
              {loading ? '🔄 转换中...' : '🖼️ 开始转换'}
            </button>

            <div className="info-box">
              <h4>💡 使用提示</h4>
              <ul>
                <li>支持 JPG, PNG 格式图像</li>
                <li>建议图像尺寸 512-2048px</li>
                <li>提示词可描述想要的风格或效果</li>
              </ul>
            </div>
          </div>
        )}

        {/* 文本生成视频 */}
        {activeTab === AiToolType.TEXT_TO_VIDEO && (
          <div className="tool-panel">
            <h2>🎬 文本生成视频</h2>
            <p className="tool-description">
              使用 SeeDance 或 Wan 2.5 从文本描述生成视频
            </p>

            <div className="form-group">
              <label>选择模型</label>
              <select 
                value={videoModel} 
                onChange={(e) => setVideoModel(e.target.value as VideoModel)}
                className="model-select"
              >
                <optgroup label="SeeDance Text-to-Video（推荐）">
                  <option value={VideoModel.SEEDANCE_PRO_T2V_480P}>⚡ SeeDance Pro 480p - 快速推荐</option>
                  <option value={VideoModel.SEEDANCE_PRO_T2V_720P}>🎬 SeeDance Pro 720p - 高清</option>
                  <option value={VideoModel.SEEDANCE_LITE_T2V_480P}>💨 SeeDance Lite 480p - 经济</option>
                  <option value={VideoModel.SEEDANCE_LITE_T2V_1080P}>📺 SeeDance Lite 1080p - 高清经济</option>
                </optgroup>
                <optgroup label="Alibaba Wan 2.5">
                  <option value={VideoModel.WAN25_TEXT_STANDARD}>🎬 Wan 2.5 Standard - 标准质量</option>
                  <option value={VideoModel.WAN25_TEXT_FAST}>⚡ Wan 2.5 Fast - 快速生成</option>
                </optgroup>
                <optgroup label="Google Veo">
                  <option value={VideoModel.VEO3_STANDARD}>💎 Veo3 - 高质量</option>
                  <option value={VideoModel.VEO3_FAST}>⚡ Veo3 Fast - 快速</option>
                  <option value={VideoModel.VEO31_TEXT_2_VIDEO}>👑 Veo3.1 - 最新</option>
                </optgroup>
                <optgroup label="OpenAI Sora">
                  <option value={VideoModel.SORA2}>🌟 Sora 2 - 顶级质量</option>
                </optgroup>
                <optgroup label="Kling">
                  <option value={VideoModel.KLING_V25_TURBO}>⚡ Kling v2.5 Turbo</option>
                  <option value={VideoModel.KLING_O1}>🎥 Kling O1</option>
                </optgroup>
                <optgroup label="MiniMax Hailuo">
                  <option value={VideoModel.MINIMAX_HAILUO_T2V_PRO}>💎 Hailuo T2V Pro - 高质量</option>
                  <option value={VideoModel.MINIMAX_HAILUO_T2V_STANDARD}>🎬 Hailuo T2V Standard</option>
                </optgroup>
              </select>
              <p className="model-hint">推荐 SeeDance Pro Fast，生成速度快</p>
            </div>

            <div className="form-group">
              <label>提示词 *</label>
              <textarea
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                placeholder="描述您想要生成的视频内容，例如：一只小鸟在蓝天中飞翔，慢动作，电影级画质"
                rows={4}
              />
            </div>

            <button 
              onClick={handleTextToVideo}
              disabled={loading || !videoPrompt.trim()}
              className="generate-btn"
            >
              {loading ? '🔄 生成中...' : '🎬 生成视频'}
            </button>

            <div className="info-box">
              <h4>⚠️ 注意事项</h4>
              <ul>
                <li>视频生成需要 1-3 分钟</li>
                <li>生成过程中会显示任务ID</li>
                <li>请耐心等待不要关闭页面</li>
                <li>建议视频时长 3-5 秒</li>
              </ul>
            </div>
          </div>
        )}

        {/* 图像生成视频 */}
        {activeTab === AiToolType.IMAGE_TO_VIDEO && (
          <div className="tool-panel">
            <h2>🎥 图像生成视频</h2>
            <p className="tool-description">将静态图像转换为动态视频</p>

            <div className="form-group">
              <label>上传图像 *</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setVideoImage(e.target.files?.[0] || null)}
                className="file-input"
              />
              {videoImage && (
                <div className="preview">
                  <img src={URL.createObjectURL(videoImage)} alt="Video Source" />
                  <p className="file-name">{videoImage.name}</p>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>动画提示词（可选）</label>
              <textarea
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                placeholder="描述想要的动画效果，例如：镜头缓慢推进、人物微笑"
                rows={3}
              />
            </div>

            <button 
              onClick={handleImageToVideo}
              disabled={loading || !videoImage}
              className="generate-btn"
            >
              {loading ? '🔄 生成中...' : '🎥 生成视频'}
            </button>

            <div className="info-box">
              <h4>💡 使用提示</h4>
              <ul>
                <li>上传清晰的图像效果更好</li>
                <li>可以描述想要的动画效果</li>
                <li>生成时间约 1-3 分钟</li>
              </ul>
            </div>
          </div>
        )}

        {/* ChatGPT Agent */}
        {activeTab === AiToolType.CHAT_AGENT && (
          <div className="tool-panel">
            <h2>🤖 ChatGPT Agent</h2>
            <p className="tool-description">智能对话代理，支持上下文对话</p>

            <div className="chat-container">
              <div className="messages">
                {agentMessages.length === 0 ? (
                  <div className="empty-chat">
                    <p>💬 开始对话吧！</p>
                  </div>
                ) : (
                  agentMessages.map((msg, index) => (
                    <div key={index} className={`message ${msg.role}`}>
                      <div className="message-content">{msg.content}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="chat-input">
                <textarea
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  placeholder="输入消息..."
                  rows={3}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      info('Agent 对话功能开发中...');
                    }
                  }}
                />
                <button 
                  onClick={handleAgentChat}
                  disabled={loading || !agentPrompt.trim()}
                  className="send-btn"
                >
                  {loading ? '🔄' : '发送'}
                </button>
              </div>
            </div>

            <div className="info-box">
              <h4>💡 使用提示</h4>
              <ul>
                <li>Agent 会记住对话历史</li>
                <li>可以进行多轮对话</li>
                <li>支持复杂的任务规划</li>
                <li>按 Enter 发送，Shift+Enter 换行</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 当前任务状态 */}
      {currentTaskId && (
        <div className="current-task">
          <h3>⏳ 当前任务</h3>
          <p>任务 ID: {currentTaskId}</p>
          <p>状态: 处理中...</p>
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
        </div>
      )}

      {/* 任务历史 */}
      <div className="task-history">
        <div className="history-header">
          <h3>📋 任务历史 ({taskHistory.length})</h3>
          <div className="history-actions">
            <button onClick={loadTaskHistory} className="refresh-btn" title="刷新">
              🔄 刷新
            </button>
            <button onClick={() => setShowHistory(!showHistory)} className="toggle-btn">
              {showHistory ? '收起 ▲' : '展开 ▼'}
            </button>
          </div>
        </div>
        
        {showHistory && (
          <>
            {/* 筛选器 */}
            <div className="history-filters">
              <select 
                value={filterProvider} 
                onChange={(e) => { setFilterProvider(e.target.value); loadTaskHistory(); }}
                className="filter-select"
              >
                <option value="all">全部服务商</option>
                {getUniqueProviders().map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              
              <select 
                value={filterStatus} 
                onChange={(e) => { setFilterStatus(e.target.value); loadTaskHistory(); }}
                className="filter-select"
              >
                <option value="all">全部状态</option>
                <option value="completed">已完成</option>
                <option value="processing">处理中</option>
                <option value="failed">失败</option>
              </select>
              
              <select 
                value={filterModel} 
                onChange={(e) => { setFilterModel(e.target.value); loadTaskHistory(); }}
                className="filter-select"
              >
                <option value="all">全部模型</option>
                {getUniqueModels().map(m => (
                  <option key={m} value={m}>{getModelLabel(m)}</option>
                ))}
              </select>
            </div>
            
            {taskHistory.length === 0 ? (
              <div className="empty-history">
                <p>📝 暂无任务历史</p>
                <p className="empty-hint">使用上方工具创建您的第一个 AI 任务</p>
              </div>
            ) : (
              <div className="history-list">
                {taskHistory.map((task) => (
                  <div key={task.taskId} className={`history-item status-${task.status}`}>
                    <div className="task-header-row">
                      <div className="task-info">
                        <span className="task-type">{getToolName(task.toolType)}</span>
                        <span className="task-provider">{getProviderFromModel(task.params?.model)}</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteTask(task.taskId)}
                        className="delete-task-btn"
                        title="删除任务"
                      >
                        🗑️
                      </button>
                    </div>
                    
                    <div className="task-model-info">
                      <span className="model-label">
                        📱 {getModelLabel(task.params?.model)}
                      </span>
                      <span className="task-time">
                        ⏰ {new Date(task.createdAt).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    
                    <div className="task-prompt">
                      💬 {task.params?.prompt || '无提示词'}
                    </div>
                    
                    {task.params?.negativePrompt && (
                      <div className="task-negative">
                        ⛔ {task.params.negativePrompt}
                      </div>
                    )}
                    
                    <div className="task-params">
                      {task.params?.width && task.params?.height && (
                        <span className="param-badge">📐 {task.params.width}x{task.params.height}</span>
                      )}
                      {task.params?.size && (
                        <span className="param-badge">📐 {task.params.size}</span>
                      )}
                      {task.params?.seed && (
                        <span className="param-badge">🎲 Seed: {task.params.seed}</span>
                      )}
                      {task.metadata?.duration && (
                        <span className="param-badge">⏱️ {task.metadata.duration}ms</span>
                      )}
                    </div>
                    
                    {/* 直接展示图像结果 */}
                    {task.status === 'completed' && task.result?.imageUrls && task.result.imageUrls.length > 0 && (
                      <div className="task-result-preview">
                        <div className="result-images">
                          {task.result.imageUrls.slice(0, 3).map((url: string, idx: number) => (
                            <div key={idx} className="result-image-item">
                              <img src={url} alt={`Result ${idx + 1}`} loading="lazy" />
                              <div className="image-overlay">
                                <a href={url} target="_blank" rel="noopener noreferrer" className="image-action">
                                  🔍 查看
                                </a>
                                <a href={url} download className="image-action">
                                  📥 下载
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                        {task.result.imageUrls.length > 3 && (
                          <div className="more-images">
                            +{task.result.imageUrls.length - 3} 张图像
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 视频结果预览 */}
                    {task.status === 'completed' && task.result?.videoUrl && (
                      <div className="task-result-preview">
                        <video 
                          src={task.result.videoUrl} 
                          controls 
                          className="result-video"
                          preload="metadata"
                        />
                      </div>
                    )}
                    
                    <div className="task-footer">
                      <span className="task-status-badge">
                        {getStatusText(task.status)}
                      </span>
                      
                      {/* 处理中 */}
                      {(task.status === 'processing' || task.status === 'pending') && (
                        <span className="task-progress">⏳ 生成中...</span>
                      )}
                      
                      {/* 失败 */}
                      {task.status === 'failed' && task.errorMessage && (
                        <span className="task-error" title={task.errorMessage}>
                          ❌ {task.errorMessage.substring(0, 30)}...
                        </span>
                      )}
                      
                      {task.progress > 0 && task.progress < 100 && (
                        <span className="task-progress-num">{task.progress}%</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 配置提示 */}
      <div className="config-notice">
        <h3>⚙️ 配置说明</h3>
        <p>要使用 AI 创作工具，需要在后端配置相应的 API Key：</p>
        <div className="config-steps">
          <div className="config-item">
            <h4>1. Wavespeed AI（推荐）</h4>
            <pre>
# backend/.env
WAVESPEED_API_KEY=your_api_key
WAVESPEED_API_URL=https://api.wavespeed.ai/v1
            </pre>
            <p>支持：SeeDream 4.0 图像生成、SeeDance 视频生成、Wan 2.5</p>
          </div>

          <div className="config-item">
            <h4>2. OpenAI（可选）</h4>
            <pre>
# backend/.env
OPENAI_API_KEY=sk-xxxxx
            </pre>
            <p>支持：DALL-E 3 图像生成、ChatGPT Agent</p>
          </div>
        </div>
        <p className="config-note">
          配置后重启后端服务：<code>cd backend && npm run start:dev</code>
        </p>
      </div>
      {ConfirmDialogComponent}
    </div>
  );
};

const getToolName = (type: string) => {
  const names: Record<string, string> = {
    text_to_image: '🎨 文本生成图像',
    image_to_image: '🖼️ 图像转换',
    text_to_video: '🎬 文本生成视频',
    image_to_video: '🎥 图像生成视频',
    chat_agent: '🤖 ChatGPT Agent',
  };
  return names[type] || type;
};

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    pending: '⏳ 等待中',
    processing: '🔄 处理中',
    completed: '✅ 已完成',
    failed: '❌ 失败',
    cancelled: '🚫 已取消',
  };
  return texts[status] || status;
};

const getModelLabel = (model: string) => {
  if (!model) return '未知模型';
  
  // 提取模型名称的最后部分
  const parts = model.split('/');
  const lastPart = parts[parts.length - 1] || model;
  
  // 友好的显示名称
  const labels: Record<string, string> = {
    // Text to Image
    'flux-2-flex': 'Flux 2 Flex',
    'flux-2-pro': 'Flux 2 Pro',
    'flux-1.1-pro-ultra': 'Flux 1.1 Pro Ultra',
    'seedream-v4': 'SeeDream 4.0',
    'nano-banana': 'Nano Banana',
    'gpt-image-1': 'GPT Image',
    
    // Image to Image
    'flux-kontext-pro': 'Flux Kontext Pro',
    'qwen-image': 'Qwen Image Edit',
    'edit': 'Edit',
    'edit-plus': 'Edit Plus',
    
    // Video
    'seedance': 'SeeDance',
    'wan-2.5': 'Wan 2.5',
    'veo3': 'Veo3',
    'veo3.1': 'Veo 3.1',
    'sora-2': 'Sora 2',
    'kling': 'Kling',
    'hailuo': 'Hailuo',
    
    // 类型标识
    'text-to-image': '文本生成',
    'image-to-image': '图像转换',
    'text-to-video': '文本视频',
    'image-to-video': '图像视频',
  };
  
  // 尝试匹配
  for (const [key, label] of Object.entries(labels)) {
    if (model.includes(key)) {
      return label;
    }
  }
  
  return lastPart;
};

export default AiTools;
