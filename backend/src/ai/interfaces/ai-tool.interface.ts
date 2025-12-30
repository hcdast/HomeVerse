// AI 工具类型枚举
export enum AiToolType {
  CHAT_AGENT = 'chat_agent',                   // ChatGPT Agent
  TEXT_TO_IMAGE = 'text_to_image',            // 文本生成图像
  IMAGE_TO_IMAGE = 'image_to_image',          // 图像编辑
  TEXT_TO_VIDEO = 'text_to_video',            // 文本生成视频
  IMAGE_TO_VIDEO = 'image_to_video',          // 图像生成视频
  VIDEO_TO_VIDEO = 'video_to_video',          // 视频编辑
  CHARACTER_FACESWAP = 'character_faceswap',  // 角色换脸
  REFERENCE_TO_VIDEO = 'reference_to_video',  // 参考图生成视频
}

// 图像生成模型（保留向后兼容）
export enum ImageModel {
  SEEDREAM_4_0 = 'seedream-4.0',
  DALL_E_3 = 'dall-e-3',
  STABLE_DIFFUSION = 'stable-diffusion',
  // Flux 系列
  FLUX_11_PRO_ULTRA = 'wavespeed-ai/flux-1.1-pro-ultra',
  FLUX_2_PRO = 'wavespeed-ai/flux-2-pro/text-to-image',
  FLUX_2_FLEX = 'wavespeed-ai/flux-2-flex/text-to-image',
}

// 视频生成模型（使用 Wavespeed API 正确格式）
export enum VideoModel {
  // SeeDance Text-to-Video 系列（推荐）
  SEEDANCE_LITE_T2V_480P = 'bytedance/seedance-v1-lite-t2v-480p',
  SEEDANCE_LITE_T2V_1080P = 'bytedance/seedance-v1-lite-t2v-1080p',
  SEEDANCE_PRO_T2V_480P = 'bytedance/seedance-v1-pro-t2v-480p',
  SEEDANCE_PRO_T2V_720P = 'bytedance/seedance-v1-pro-t2v-720p',
  
  // SeeDance Image-to-Video 系列
  SEEDANCE_LITE_I2V_480P = 'bytedance/seedance-v1-lite-i2v-480p',
  SEEDANCE_PRO_I2V_720P = 'bytedance/seedance-v1-pro-i2v-720p',
  
  // Wan 2.5 系列
  WAN25_TEXT_STANDARD = 'alibaba/wan-2.5/text-to-video',
  WAN25_TEXT_FAST = 'alibaba/wan-2.5/text-to-video-fast',
  WAN25_IMAGE_STANDARD = 'alibaba/wan-2.5/image-to-video',
  WAN25_IMAGE_FAST = 'alibaba/wan-2.5/image-to-video-fast',
  
  // Veo3 系列
  VEO3_STANDARD = 'google/veo3',
  VEO3_FAST = 'google/veo3-fast',
  VEO31_TEXT_2_VIDEO = 'google/veo3.1/text-to-video',
  VEO31_I2V = 'google/veo3.1/image-to-video',
  
  // Kling 系列
  KLING_V25_TURBO_T2V = 'kwaivgi/kling-v2.5-turbo-pro/text-to-video',
  KLING_V25_TURBO_I2V = 'kwaivgi/kling-v2.5-turbo-pro/image-to-video',
  KLING_O1_T2V = 'kwaivgi/kling-video-o1/text-to-video',
  KLING_O1_I2V = 'kwaivgi/kling-video-o1/image-to-video',
  
  // Sora 2
  SORA2_T2V = 'openai/sora-2/text-to-video',
  SORA2_I2V = 'openai/sora-2/image-to-video',
  
  // MiniMax Hailuo 系列
  MINIMAX_HAILUO_T2V_PRO = 'minimax/hailuo-02/t2v-pro',
  MINIMAX_HAILUO_T2V_STANDARD = 'minimax/hailuo-02/standard',
  MINIMAX_HAILUO_I2V_STANDARD = 'minimax/hailuo-02/i2v-standard',
  MINIMAX_HAILUO_I2V_FAST = 'minimax/hailuo-02/fast',
}

// AI 工具提供商接口
export interface AiToolProvider {
  // 获取工具名称
  getName(): string;

  // 获取工具类型
  getType(): AiToolType;

  // 检查是否已配置
  isConfigured(): boolean;

  // 执行工具任务
  execute(params: AiToolParams): Promise<AiToolResult>;

  // 获取任务状态
  getTaskStatus?(taskId: string): Promise<TaskStatus>;

  // 取消任务
  cancelTask?(taskId: string): Promise<void>;
}

// AI 工具参数
export interface AiToolParams {
  // 通用参数
  prompt?: string;
  model?: string;
  negativePrompt?: string;
  seed?: number;
  
  // 图像相关参数
  imageUrl?: string;
  imageFile?: Express.Multer.File;
  imageUrls?: string[];              // 多图输入
  imageFiles?: Express.Multer.File[]; // 多图文件
  width?: number;
  height?: number;
  aspectRatio?: string;              // 宽高比，如 "16:9"
  resolution?: string;                // 分辨率，如 "720p"
  size?: string;                      // 尺寸，如 "1024x1024"
  outputFormat?: string;              // 输出格式 png/jpeg
  
  // 生成控制参数
  steps?: number;                     // 推理步数
  guidanceScale?: number;             // 引导强度
  strength?: number;                  // 变换强度(图像编辑)
  numImages?: number;                 // 生成图像数量
  
  // 视频相关参数
  videoUrl?: string;                  // 输入视频URL
  videoFile?: Express.Multer.File;    // 输入视频文件
  duration?: number;                  // 视频时长(秒)
  fps?: number;                       // 帧率
  framepersecond?: number;            // 帧率(替代名称)
  motionStrength?: number;            // 动作强度
  cameraFixed?: boolean;              // 固定镜头
  firstFrame?: string;                // 首帧图像
  lastFrame?: string;                 // 尾帧图像
  generateAudio?: boolean;            // 生成音频
  keepOriginalAudio?: boolean;        // 保留原始音频
  audio?: string;                     // 音频URL
  enablePromptExpansion?: boolean;    // 启用提示词扩展
  
  // 角色换脸相关
  mode?: 'animate' | 'replace';       // 动画模式
  
  // Agent 相关
  agentId?: string;
  conversationId?: string;
  messages?: any[];
  functions?: any[];
  
  // 其他参数
  [key: string]: any;                 // 允许扩展参数
}

// AI 工具结果
export interface AiToolResult {
  success: boolean;
  message?: string;
  
  // 结果数据
  data?: {
    // 文本结果
    text?: string;
    
    // 图像结果
    imageUrl?: string;
    imageUrls?: string[];
    
    // 视频结果
    videoUrl?: string;
    thumbnailUrl?: string;
    
    // Agent 结果
    response?: string;
    conversationId?: string;
    
    // 任务信息
    taskId?: string;
    status?: TaskStatus;
  };
  
  // 元数据
  metadata?: {
    model?: string;
    provider?: string;
    duration?: number;
    cost?: number;
  };
}

// 任务状态
export interface TaskStatus {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// AI 工具配置
export interface AiToolConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  proxy?: string;
}

