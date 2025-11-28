import api from './api'; // 使用配置好的 api 实例

const API_URL = '/search';

export interface SearchResult {
  type: 'article' | 'file' | 'album' | 'photo';
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  createdAt: Date;
  author?: {
    _id: string;
    username: string;
    avatar?: string;
  };
  metadata?: any;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
}

class SearchService {
  // 全局搜索
  async search(params: {
    keyword: string;
    type?: 'all' | 'article' | 'file' | 'album';
    page?: number;
    limit?: number;
  }): Promise<SearchResponse> {
    const response = await api.get(API_URL, { params });
    return response.data;
  }

  // 高级搜索
  async advancedSearch(params: {
    keyword: string;
    type?: 'all' | 'article' | 'file' | 'album';
    startDate?: string;
    endDate?: string;
    tags?: string[];
    page?: number;
    limit?: number;
  }): Promise<{ results: SearchResult[]; total: number }> {
    const response = await api.get(`${API_URL}/advanced`, { params });
    return response.data;
  }

  // 获取热门标签
  async getPopularTags(limit?: number): Promise<{ tag: string; count: number }[]> {
    const response = await api.get(`${API_URL}/tags/popular`, {
      params: { limit },
    });
    return response.data;
  }
}

export default new SearchService();

