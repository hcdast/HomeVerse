import api from './api';

// AI 工具类型
export enum AiToolType {
  CHAT_AGENT = 'chat_agent',
  TEXT_TO_IMAGE = 'text_to_image',
  IMAGE_TO_IMAGE = 'image_to_image',
  TEXT_TO_VIDEO = 'text_to_video',
  IMAGE_TO_VIDEO = 'image_to_video',
}

// 图像模型（常用推荐）
export enum ImageModel {
  // Wavespeed Flux 系列（推荐）
  FLUX_2_FLEX = 'wavespeed-ai/flux-2-flex/text-to-image',
  FLUX_2_PRO = 'wavespeed-ai/flux-2-pro/text-to-image',
  FLUX_11_PRO_ULTRA = 'wavespeed-ai/flux-1.1-pro-ultra',
  
  // ByteDance
  SEEDREAM_4 = 'bytedance/seedream-v4',
  
  // Google
  GOOGLE_NANO_BANANA = 'google/nano-banana/text-to-image',
  
  // OpenAI
  OPENAI_GPT_IMAGE = 'openai/gpt-image-1/text-to-image',
}

// 图像转换模型（Image-to-Image）
export enum Image2ImageModel {
  // Wavespeed Flux 系列（推荐）
  FLUX_KONTEXT_PRO = 'wavespeed-ai/flux-kontext-pro',
  FLUX_2_FLEX_EDIT = 'wavespeed-ai/flux-2-flex/edit',
  FLUX_2_PRO_EDIT = 'wavespeed-ai/flux-2-pro/edit',
  
  // ByteDance
  SEEDREAM_4_EDIT = 'bytedance/seedream-v4/edit',
  
  // Google
  GOOGLE_NANO_BANANA_EDIT = 'google/nano-banana/edit',
  GOOGLE_NANO_BANANA_PRO_EDIT = 'google/nano-banana-pro/edit',
  
  // Qwen
  QWEN_IMAGE_EDIT = 'wavespeed-ai/qwen-image/edit-plus',
}

// 视频模型（常用推荐）- 使用 Wavespeed API 正确格式
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
  
  // Kling 系列
  KLING_V25_TURBO = 'kwaivgi/kling-v2.5-turbo-pro/text-to-video',
  KLING_O1 = 'kwaivgi/kling-video-o1/text-to-video',
  
  // Sora 2
  SORA2 = 'openai/sora-2/text-to-video',
  
  // MiniMax Hailuo 系列
  MINIMAX_HAILUO_T2V_PRO = 'minimax/hailuo-02/t2v-pro',
  MINIMAX_HAILUO_T2V_STANDARD = 'minimax/hailuo-02/standard',
  MINIMAX_HAILUO_I2V_STANDARD = 'minimax/hailuo-02/i2v-standard',
  MINIMAX_HAILUO_I2V_FAST = 'minimax/hailuo-02/fast',
}

// 工具信息接口
export interface AiToolInfo {
  type: AiToolType;
  name: string;
  configured: boolean;
  description: string;
}

class AiToolsService {
  // 获取所有可用工具
  async getTools(): Promise<{ tools: AiToolInfo[]; statistics: any }> {
    try {
      const response = await api.get('/ai/tools');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '获取工具列表失败');
    }
  }

  // ChatGPT Agent - 对话
  async chatAgent(params: {
    prompt?: string;
    messages?: any[];
    agentId?: string;
    conversationId?: string;
    model?: string;
  }): Promise<any> {
    try {
      const response = await api.post('/ai/tools/chat-agent', params, {
        timeout: 120000,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Agent 对话失败');
    }
  }

  // 创建 Agent
  async createAgent(name: string, instructions: string, functions?: any[]): Promise<string> {
    try {
      const response = await api.post('/ai/tools/chat-agent/create', {
        name,
        instructions,
        functions,
      });
      return response.data.agentId;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '创建 Agent 失败');
    }
  }

  // 获取 Agent 列表
  async listAgents(): Promise<any[]> {
    try {
      const response = await api.get('/ai/tools/chat-agent/list');
      return response.data.agents;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '获取 Agent 列表失败');
    }
  }

  // 文本生成图像
  async textToImage(params: {
    prompt: string;
    model?: ImageModel;
    width?: number;
    height?: number;
    steps?: number;
    seed?: number;
    guidanceScale?: number;
    negativePrompt?: string;
  }): Promise<any> {
    try {
      const response = await api.post('/ai/tools/text-to-image', params, {
        timeout: 180000, // 3分钟
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '图像生成失败');
    }
  }

  // 图像转换
  async imageToImage(params: {
    image: File;
    prompt?: string;
    model?: string;
    negativePrompt?: string;
    steps?: number;
    seed?: number;
    guidanceScale?: number;
  }): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('image', params.image);
      
      if (params.prompt) formData.append('prompt', params.prompt);
      if (params.model) formData.append('model', params.model);
      if (params.negativePrompt) formData.append('negativePrompt', params.negativePrompt);
      if (params.steps) formData.append('steps', params.steps.toString());
      if (params.seed) formData.append('seed', params.seed.toString());
      if (params.guidanceScale) formData.append('guidanceScale', params.guidanceScale.toString());

      const response = await api.post('/ai/tools/image-to-image', formData, {
        timeout: 180000,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '图像转换失败');
    }
  }

  // 文本生成视频
  async textToVideo(params: {
    prompt: string;
    model?: VideoModel;
    duration?: number;
    fps?: number;
    negativePrompt?: string;
  }): Promise<any> {
    try {
      const response = await api.post('/ai/tools/text-to-video', params, {
        timeout: 300000, // 5分钟
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '视频生成失败');
    }
  }

  // 图像生成视频
  async imageToVideo(params: {
    image: File;
    prompt?: string;
    model?: VideoModel;
    duration?: number;
    motionStrength?: number;
  }): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('image', params.image);
      
      if (params.prompt) formData.append('prompt', params.prompt);
      if (params.model) formData.append('model', params.model);
      if (params.duration) formData.append('duration', params.duration.toString());
      if (params.motionStrength) formData.append('motionStrength', params.motionStrength.toString());

      const response = await api.post('/ai/tools/image-to-video', formData, {
        timeout: 300000,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '视频生成失败');
    }
  }

  // 获取任务详情
  async getTaskDetail(taskId: string, checkRemote: boolean = false): Promise<any> {
    try {
      const response = await api.get(`/ai/tools/task/${taskId}`, {
        params: { checkRemote: checkRemote ? 'true' : 'false' },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '获取任务详情失败');
    }
  }

  // 获取我的任务列表
  async getMyTasks(params?: {
    toolType?: AiToolType;
    status?: string;
    limit?: number;
  }): Promise<any> {
    try {
      const response = await api.get('/ai/tools/my-tasks', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '获取任务列表失败');
    }
  }

  // 获取任务统计
  async getStatistics(): Promise<any> {
    try {
      const response = await api.get('/ai/tools/statistics');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '获取统计失败');
    }
  }

  // 删除任务
  async deleteTask(taskId: string): Promise<void> {
    try {
      await api.delete(`/ai/tools/task/${taskId}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '删除任务失败');
    }
  }
}

export default new AiToolsService();

