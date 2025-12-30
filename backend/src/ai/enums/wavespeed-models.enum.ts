/**
 * Wavespeed AI 完整模型枚举
 * 根据官方支持的所有模型更新
 */

// ==================== 图像生成模型 ====================

export enum ImageModelName {
  // 简短别名（常用）
  FLUX_11_PRO_ULTRA = 'wavespeed-ai/flux-1.1-pro-ultra',
  FLUX_2_PRO = 'wavespeed-ai/flux-2-pro/text-to-image',
  FLUX_2_FLEX = 'wavespeed-ai/flux-2-flex/text-to-image',
  FLUX_KONTEXT_PRO = 'wavespeed-ai/flux-kontext-pro',
  SEEDREAM_4 = 'bytedance/seedream-v4',
  
  // OpenAI 模型
  OPENAI_GPT_IMAGE_1 = 'openai/gpt-image-1/text-to-image',
  
  // Google 模型
  GOOGLE_NANO_BANANA_TEXT_2_IMAGE = 'google/nano-banana/text-to-image',
  GOOGLE_NANO_BANANA_PRO_TEXT_2_IMAGE = 'google/nano-banana-pro/text-to-image',
  GOOGLE_NANO_BANANA_IMAGE_2_IMAGE = 'google/nano-banana/edit',
  GOOGLE_NANO_BANANA_PRO_IMAGE_2_IMAGE = 'google/nano-banana-pro/edit',
  
  // ByteDance 模型 (SeeDream)
  BYTEDANCE_SEEDREAM_V4_TEXT_2_IMAGE = 'bytedance/seedream-v4',
  BYTEDANCE_SEEDREAM_4_IMAGE_2_IMAGE = 'bytedance/seedream-v4/edit',
  BYTEDANCE_SEEDREAM_4_EDIT_SEQUENTIAL = 'bytedance/seedream-v4/edit-sequential',
  
  // WaveSpeed AI 模型 (Flux系列)
  WAVESPEED_FLUX_11_PRO_ULTRA_TEXT_2_IMAGE = 'wavespeed-ai/flux-1.1-pro-ultra',
  WAVESPEED_FLUX_2_FLEX_TEXT_2_IMAGE = 'wavespeed-ai/flux-2-flex/text-to-image',
  WAVESPEED_FLUX_2_PRO_TEXT_2_IMAGE = 'wavespeed-ai/flux-2-pro/text-to-image',
  WAVESPEED_FLUX_1_PRO_ULTRA_IMAGE_2_IMAGE = 'wavespeed-ai/flux-1-prpo/image-to-image',
  WAVESPEED_AI_QWEN_IMAGE_EDIT_PLUS = 'wavespeed-ai/qwen-image/edit-plus',
  WAVESPEED_FLUX_KONTEXT_PRO_IMAGE_2_IMAGE = 'wavespeed-ai/flux-kontext-pro',
  WAVESPEED_FLUX_KONTEXT_PRO_MULTI_IMAGE_2_IMAGE = 'wavespeed-ai/flux-kontext-pro/multi',
  WAVESPEED_FLUX_KONTEXT_PRO_MULTI_ULTRA_FAST = 'wavespeed-ai/flux-kontext-pro/multi-ultra-fast',
  WAVESPEED_FLUX_2_FLEX_EDIT = 'wavespeed-ai/flux-2-flex/edit',
  WAVESPEED_FLUX_2_PRO_EDIT = 'wavespeed-ai/flux-2-pro/edit',
}

// ==================== 视频生成模型 ====================

export enum VideoModelName {
  // SeeDance 系列 - 使用 Wavespeed API 正确的模型名称格式
  // Text-to-Video 模型
  SEEDANCE_LITE_T2V_480P = 'bytedance/seedance-v1-lite-t2v-480p',
  SEEDANCE_LITE_T2V_1080P = 'bytedance/seedance-v1-lite-t2v-1080p',
  SEEDANCE_PRO_T2V_480P = 'bytedance/seedance-v1-pro-t2v-480p',
  SEEDANCE_PRO_T2V_720P = 'bytedance/seedance-v1-pro-t2v-720p',
  
  // Image-to-Video 模型
  SEEDANCE_LITE_I2V_480P = 'bytedance/seedance-v1-lite-i2v-480p',
  SEEDANCE_PRO_I2V_720P = 'bytedance/seedance-v1-pro-i2v-720p',
  
  // Vidu 系列
  AKOOL_VIDU_Q2_TEXT_2_VIDEO = 'vidu/viduq2/text-to-video',
  AKOOL_VIDU_Q2_REFERENCE_TO_VIDEO = 'vidu/reference-to-video-q2',
  
  // SeeDance Reference
  AKOOL_SEEDANCE_LITE_REFERENCE_TO_VIDEO = 'bytedance/seedance-v1-lite/reference-to-video',
  
  // Veo3.1 系列
  VEO3_REFERENCE_TO_VIDEO = 'google/veo3.1/reference-to-video',
  
  // Sora2 系列
  SORA2_TEXT_2_VIDEO = 'openai/sora-2/text-to-video',
  SORA2_PROJECT_2_VIDEO = 'openai/sora-2/text-to-video-pro',
  SORA2_IMAGE_2_VIDEO = 'openai/sora-2/image-to-video',
  SORA2_PRO_IMAGE_2_VIDEO = 'openai/sora-2/image-to-video-pro',
  
  // Wan25 系列
  WAN25_TEXT_2_VIDEO_STANDARD = 'alibaba/wan-2.5/text-to-video',
  WAN25_TEXT_2_VIDEO_FAST = 'alibaba/wan-2.5/text-to-video-fast',
  WAN25_IMAGE_2_VIDEO_STANDARD = 'alibaba/wan-2.5/image-to-video',
  WAN25_IMAGE_2_VIDEO_FAST = 'alibaba/wan-2.5/image-to-video-fast',
  WAN21_V2V_LORA = 'wavespeed-ai/wan-2.1/v2v-720p-lora',
  WAN2_VIDEO_EDIT = 'wavespeed-ai/Wan-2.2/video-edit',
  
  // Veo3 系列
  VEO3_TEXT_2_VIDEO_STANDARD = 'google/veo3',
  VEO3_TEXT_2_VIDEO_FAST = 'google/veo3-fast',
  VEO3_IMAGE_2_VIDEO_STANDARD = 'google/veo3/image-to-video',
  VEO3_IMAGE_2_VIDEO_FAST = 'google/veo3-fast/image-to-video',
  
  // Veo3.1 系列
  VEO31_IMAGE_2_VIDEO = 'google/veo3.1/image-to-video',
  VEO31_IMAGE_2_VIDEO_FAST = 'google/veo3.1-fast/image-to-video',
  VEO31_TEXT_2_VIDEO = 'google/veo3.1/text-to-video',
  VEO31_TEXT_2_VIDEO_FAST = 'google/veo3.1-fast/text-to-video',
  
  // MiniMax Hailuo 系列 - 使用正确的 Wavespeed API 格式
  MINIMAX_HAILUO_02_T2V_PRO = 'minimax/hailuo-02/t2v-pro',
  MINIMAX_HAILUO_02_T2V_STANDARD = 'minimax/hailuo-02/standard',
  MINIMAX_HAILUO_02_I2V_STANDARD = 'minimax/hailuo-02/i2v-standard',
  MINIMAX_HAILUO_02_I2V_FAST = 'minimax/hailuo-02/fast',
  MINIMAX_HAILUO_02_PRO = 'minimax/hailuo-02/pro',
  
  // Kling 系列
  KLING_TEXT_2_VIDEO_TURBO_PRO = 'kwaivgi/kling-v2.5-turbo-pro/text-to-video',
  KLING_IMAGE_2_VIDEO_TURBO_PRO = 'kwaivgi/kling-v2.5-turbo-pro/image-to-video',
  KLING_IMAGE_2_VIDEO_O1 = 'kwaivgi/kling-video-o1/image-to-video',
  KLING_TEXT_2_VIDEO_O1 = 'kwaivgi/kling-video-o1/text-to-video',
  KLING_REFERENCE_TO_VIDEO = 'kwaivgi/kling-video-o1/reference-to-video',
  KLING_VIDEO_2_VIDEO_EDIT = 'kwaivgi/kling-video-o1/video-edit',
  KLING_VIDEO_2_VIDEO_EDIT_FAST = 'kwaivgi/kling-video-o1/video-edit-fast',
}

// ==================== 模型配置接口 ====================

export interface ModelConfig {
  name: string;
  label: string;
  provider: string;
  category: string;
  description: string;
  maxSize?: string;
  pricing?: number;
  features?: string[];
}

// ==================== 获取模型配置 ====================

export function getImageModelConfig(modelName: ImageModelName): ModelConfig {
  const configs: Partial<Record<ImageModelName, ModelConfig>> = {
    // OpenAI
    [ImageModelName.OPENAI_GPT_IMAGE_1]: {
      name: modelName,
      label: 'OpenAI GPT Image 1',
      provider: 'OpenAI',
      category: 'text-to-image',
      description: 'OpenAI 图像生成模型',
      maxSize: '1024*1024',
      pricing: 0.02,
    },
    
    // Google Nano Banana
    [ImageModelName.GOOGLE_NANO_BANANA_TEXT_2_IMAGE]: {
      name: modelName,
      label: 'Google Nano Banana',
      provider: 'Google',
      category: 'text-to-image',
      description: 'Google 图像生成模型',
      maxSize: '1024*1024',
      pricing: 0.01,
    },
    
    // ByteDance SeeDream
    [ImageModelName.BYTEDANCE_SEEDREAM_V4_TEXT_2_IMAGE]: {
      name: modelName,
      label: 'SeeDream 4.0',
      provider: 'ByteDance',
      category: 'text-to-image',
      description: '字节跳动高质量图像生成',
      maxSize: '2048*2048',
      pricing: 0.015,
      features: ['中文优化', '高质量', '快速'],
    },
    
    // Wavespeed Flux
    [ImageModelName.WAVESPEED_FLUX_2_FLEX_TEXT_2_IMAGE]: {
      name: modelName,
      label: 'Flux 2 Flex',
      provider: 'Wavespeed',
      category: 'text-to-image',
      description: '快速灵活的图像生成',
      maxSize: '2048*2048',
      pricing: 0.01,
      features: ['快速', '经济', '推荐'],
    },
    
    [ImageModelName.WAVESPEED_FLUX_2_PRO_TEXT_2_IMAGE]: {
      name: modelName,
      label: 'Flux 2 Pro',
      provider: 'Wavespeed',
      category: 'text-to-image',
      description: '专业级图像质量',
      maxSize: '2048*2048',
      pricing: 0.02,
      features: ['高质量', '专业'],
    },
    
    [ImageModelName.WAVESPEED_FLUX_11_PRO_ULTRA_TEXT_2_IMAGE]: {
      name: modelName,
      label: 'Flux 1.1 Pro Ultra',
      provider: 'Wavespeed',
      category: 'text-to-image',
      description: '最高质量图像生成',
      maxSize: '2048*2048',
      pricing: 0.04,
      features: ['顶级质量', '细节丰富'],
    },
    
    [ImageModelName.WAVESPEED_FLUX_KONTEXT_PRO_IMAGE_2_IMAGE]: {
      name: modelName,
      label: 'Flux Kontext Pro',
      provider: 'Wavespeed',
      category: 'image-to-image',
      description: '上下文感知的图像编辑',
      maxSize: '2048*2048',
      pricing: 0.015,
      features: ['智能编辑', '保持风格'],
    },
  };

  return configs[modelName] || {
    name: modelName,
    label: modelName.split('/').pop() || modelName,
    provider: 'Wavespeed',
    category: 'unknown',
    description: '图像生成模型',
    pricing: 0.01,
  };
}

export function getVideoModelConfig(modelName: VideoModelName): ModelConfig {
  const configs: Partial<Record<VideoModelName, ModelConfig>> = {
    // SeeDance Text-to-Video 系列
    [VideoModelName.SEEDANCE_LITE_T2V_480P]: {
      name: modelName,
      label: 'SeeDance Lite (480p)',
      provider: 'ByteDance',
      category: 'text-to-video',
      description: '轻量级文本生成视频',
      pricing: 0.03,
      features: ['经济', '5-10秒视频'],
    },
    [VideoModelName.SEEDANCE_LITE_T2V_1080P]: {
      name: modelName,
      label: 'SeeDance Lite (1080p)',
      provider: 'ByteDance',
      category: 'text-to-video',
      description: '轻量级高清文本生成视频',
      pricing: 0.04,
      features: ['高清', '5-10秒视频'],
    },
    [VideoModelName.SEEDANCE_PRO_T2V_480P]: {
      name: modelName,
      label: 'SeeDance Pro (480p)',
      provider: 'ByteDance',
      category: 'text-to-video',
      description: '专业级文本生成视频',
      pricing: 0.05,
      features: ['高质量', '5-10秒视频', '推荐'],
    },
    [VideoModelName.SEEDANCE_PRO_T2V_720P]: {
      name: modelName,
      label: 'SeeDance Pro (720p)',
      provider: 'ByteDance',
      category: 'text-to-video',
      description: '专业级高清文本生成视频',
      pricing: 0.06,
      features: ['高清', '高质量', '推荐'],
    },
    
    // SeeDance Image-to-Video 系列
    [VideoModelName.SEEDANCE_LITE_I2V_480P]: {
      name: modelName,
      label: 'SeeDance Lite I2V (480p)',
      provider: 'ByteDance',
      category: 'image-to-video',
      description: '轻量级图像生成视频',
      pricing: 0.03,
      features: ['经济', '图像动画'],
    },
    [VideoModelName.SEEDANCE_PRO_I2V_720P]: {
      name: modelName,
      label: 'SeeDance Pro I2V (720p)',
      provider: 'ByteDance',
      category: 'image-to-video',
      description: '专业级图像生成视频',
      pricing: 0.05,
      features: ['高清', '高质量'],
    },
    
    // Wan25 系列
    [VideoModelName.WAN25_TEXT_2_VIDEO_STANDARD]: {
      name: modelName,
      label: 'Wan 2.5 Standard',
      provider: 'Alibaba',
      category: 'text-to-video',
      description: '阿里云标准视频生成',
      pricing: 0.04,
      features: ['稳定', '质量好'],
    },
    
    [VideoModelName.WAN25_TEXT_2_VIDEO_FAST]: {
      name: modelName,
      label: 'Wan 2.5 Fast',
      provider: 'Alibaba',
      category: 'text-to-video',
      description: '快速视频生成',
      pricing: 0.03,
      features: ['快速', '经济'],
    },
    
    [VideoModelName.WAN25_IMAGE_2_VIDEO_STANDARD]: {
      name: modelName,
      label: 'Wan 2.5 Image (标准)',
      provider: 'Alibaba',
      category: 'image-to-video',
      description: '图像生成视频',
      pricing: 0.04,
    },
    
    [VideoModelName.WAN25_IMAGE_2_VIDEO_FAST]: {
      name: modelName,
      label: 'Wan 2.5 Image (快速)',
      provider: 'Alibaba',
      category: 'image-to-video',
      description: '快速图像动画化',
      pricing: 0.03,
    },
    
    // Veo3 系列
    [VideoModelName.VEO3_TEXT_2_VIDEO_STANDARD]: {
      name: modelName,
      label: 'Veo3 Standard',
      provider: 'Google',
      category: 'text-to-video',
      description: 'Google 视频生成',
      pricing: 0.06,
      features: ['高质量', '真实感强'],
    },
    
    [VideoModelName.VEO3_TEXT_2_VIDEO_FAST]: {
      name: modelName,
      label: 'Veo3 Fast',
      provider: 'Google',
      category: 'text-to-video',
      description: '快速视频生成',
      pricing: 0.04,
    },
    
    // Veo3.1 系列
    [VideoModelName.VEO31_TEXT_2_VIDEO]: {
      name: modelName,
      label: 'Veo3.1',
      provider: 'Google',
      category: 'text-to-video',
      description: 'Google 最新视频模型',
      pricing: 0.08,
      features: ['最新', '顶级质量'],
    },
    
    // Sora2 系列
    [VideoModelName.SORA2_TEXT_2_VIDEO]: {
      name: modelName,
      label: 'Sora 2',
      provider: 'OpenAI',
      category: 'text-to-video',
      description: 'OpenAI 视频生成',
      pricing: 0.10,
      features: ['顶级质量', '最真实'],
    },
    
    [VideoModelName.SORA2_IMAGE_2_VIDEO]: {
      name: modelName,
      label: 'Sora 2 Image',
      provider: 'OpenAI',
      category: 'image-to-video',
      description: 'Sora 图像动画化',
      pricing: 0.10,
    },
    
    // Kling 系列
    [VideoModelName.KLING_TEXT_2_VIDEO_TURBO_PRO]: {
      name: modelName,
      label: 'Kling v2.5 Turbo Pro',
      provider: 'Kuaishou',
      category: 'text-to-video',
      description: '快手视频生成',
      pricing: 0.05,
      features: ['快速', '流畅'],
    },
    
    [VideoModelName.KLING_TEXT_2_VIDEO_O1]: {
      name: modelName,
      label: 'Kling Video O1',
      provider: 'Kuaishou',
      category: 'text-to-video',
      description: '快手新一代视频模型',
      pricing: 0.06,
    },
    
    // MiniMax Hailuo 系列
    [VideoModelName.MINIMAX_HAILUO_02_T2V_PRO]: {
      name: modelName,
      label: 'Hailuo 02 T2V Pro',
      provider: 'MiniMax',
      category: 'text-to-video',
      description: 'MiniMax 高质量视频生成',
      pricing: 0.05,
      features: ['高质量', '6秒视频'],
    },
    [VideoModelName.MINIMAX_HAILUO_02_T2V_STANDARD]: {
      name: modelName,
      label: 'Hailuo 02 T2V Standard',
      provider: 'MiniMax',
      category: 'text-to-video',
      description: 'MiniMax 标准视频生成',
      pricing: 0.04,
      features: ['6-10秒视频'],
    },
    [VideoModelName.MINIMAX_HAILUO_02_I2V_STANDARD]: {
      name: modelName,
      label: 'Hailuo 02 I2V Standard',
      provider: 'MiniMax',
      category: 'image-to-video',
      description: 'MiniMax 图像转视频',
      pricing: 0.04,
      features: ['6-10秒视频'],
    },
    [VideoModelName.MINIMAX_HAILUO_02_I2V_FAST]: {
      name: modelName,
      label: 'Hailuo 02 I2V Fast',
      provider: 'MiniMax',
      category: 'image-to-video',
      description: 'MiniMax 快速图像转视频',
      pricing: 0.03,
      features: ['快速', '6-10秒视频'],
    },
  };

  return configs[modelName] || {
    name: modelName,
    label: modelName.split('/').pop() || modelName,
    provider: 'Unknown',
    category: 'video',
    description: '视频生成模型',
    pricing: 0.05,
  };
}

// 统一的获取配置函数
export function getModelConfig(modelName: ImageModelName | VideoModelName | string): ModelConfig {
  // 尝试作为图像模型
  if (Object.values(ImageModelName).includes(modelName as ImageModelName)) {
    return getImageModelConfig(modelName as ImageModelName);
  }
  
  // 尝试作为视频模型
  if (Object.values(VideoModelName).includes(modelName as VideoModelName)) {
    return getVideoModelConfig(modelName as VideoModelName);
  }
  
  // 默认配置
  return {
    name: modelName,
    label: modelName,
    provider: 'Unknown',
    category: 'unknown',
    description: 'AI 模型',
    pricing: 0.01,
  };
}

// ==================== 辅助函数 ====================

export function getPricingConfig(modelName: ImageModelName | VideoModelName): number {
  const config = getModelConfig(modelName);
  return config.pricing || 0.01;
}

export function getAllImageModels(): ModelConfig[] {
  return Object.values(ImageModelName).map(name => getImageModelConfig(name));
}

export function getAllVideoModels(): ModelConfig[] {
  return Object.values(VideoModelName).map(name => getVideoModelConfig(name));
}

export function getModelsByProvider(provider: string): ModelConfig[] {
  const allModels = [
    ...getAllImageModels(),
    ...getAllVideoModels(),
  ];
  
  return allModels.filter(m => m.provider === provider);
}

export function getModelsByCategory(category: string): ModelConfig[] {
  const allModels = [
    ...getAllImageModels(),
    ...getAllVideoModels(),
  ];
  
  return allModels.filter(m => m.category === category);
}

export function calculateVideoCredit(duration: number, resolution: string = '720p'): number {
  const baseCredit = duration * 10;
  const resolutionMultiplier = 
    resolution === '4K' ? 3 :
    resolution === '1080p' ? 2 :
    resolution === '720p' ? 1 : 1;
  
  return Math.ceil(baseCredit * resolutionMultiplier);
}
