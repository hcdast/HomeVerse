/**
 * 前端应用配置
 * 
 * 环境变量配置说明：
 * 1. 在项目根目录创建 .env 文件
 * 2. 添加以下配置项：
 *    - VITE_API_BASE_URL: API 基础地址
 *    - VITE_BAIDU_MAP_AK: 百度地图 AK
 *    - VITE_MAP_DEFAULT_CENTER_LAT: 默认地图中心纬度
 *    - VITE_MAP_DEFAULT_CENTER_LNG: 默认地图中心经度
 *    - VITE_MAP_DEFAULT_ZOOM: 默认地图缩放级别
 */

// API 配置
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
};

// 百度地图配置
export const BAIDU_MAP_CONFIG = {
  // 百度地图 AK（密钥）
  ak: import.meta.env.VITE_BAIDU_MAP_AK || '',
  // API 版本
  version: '3.0',
  // SDK 加载地址
  get sdkUrl() {
    if (!this.ak) {
      console.warn('百度地图 AK 未配置，请在 .env 文件中设置 VITE_BAIDU_MAP_AK');
      return '';
    }
    return `https://api.map.baidu.com/api?v=${this.version}&ak=${this.ak}&callback=__baiduMapInitCallback__`;
  },
};

// 地图默认配置
export const MAP_DEFAULT_CONFIG = {
  // 默认中心点 - 北京
  center: {
    lat: parseFloat(import.meta.env.VITE_MAP_DEFAULT_CENTER_LAT || '39.915'),
    lng: parseFloat(import.meta.env.VITE_MAP_DEFAULT_CENTER_LNG || '116.404'),
  },
  // 默认缩放级别
  zoom: parseInt(import.meta.env.VITE_MAP_DEFAULT_ZOOM || '15', 10),
  // 最小缩放级别
  minZoom: 3,
  // 最大缩放级别
  maxZoom: 19,
};

// 应用信息
export const APP_INFO = {
  name: 'HomeVerse',
  version: '1.0.0',
  description: '家庭管理平台',
};

// 导出所有配置
export default {
  api: API_CONFIG,
  baiduMap: BAIDU_MAP_CONFIG,
  mapDefault: MAP_DEFAULT_CONFIG,
  app: APP_INFO,
};


