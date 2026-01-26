/**
 * 百度地图 SDK 动态加载器
 * 
 * 功能：
 * - 动态加载百度地图 JavaScript SDK
 * - 支持异步加载和回调
 * - 防止重复加载
 * - 提供加载状态管理
 */

import { BAIDU_MAP_CONFIG } from '../config';

// 加载状态枚举
export enum MapLoadStatus {
  NOT_LOADED = 'NOT_LOADED',
  LOADING = 'LOADING',
  LOADED = 'LOADED',
  ERROR = 'ERROR',
}

// 百度地图全局类型声明
declare global {
  interface Window {
    BMap: any;
    BMapGL: any;
    __baiduMapInitCallback__: () => void;
  }
}

// 加载状态
let loadStatus: MapLoadStatus = MapLoadStatus.NOT_LOADED;
let loadPromise: Promise<void> | null = null;
let loadError: Error | null = null;

// 等待队列
const waitingCallbacks: Array<{
  resolve: () => void;
  reject: (error: Error) => void;
}> = [];

/**
 * 检查百度地图 SDK 是否已加载
 */
export function isBaiduMapLoaded(): boolean {
  return typeof window !== 'undefined' && !!window.BMap;
}

/**
 * 获取当前加载状态
 */
export function getLoadStatus(): MapLoadStatus {
  return loadStatus;
}

/**
 * 获取加载错误信息
 */
export function getLoadError(): Error | null {
  return loadError;
}

/**
 * 加载百度地图 SDK
 * @returns Promise<void>
 */
export function loadBaiduMapSDK(): Promise<void> {
  // 如果已加载，直接返回
  if (isBaiduMapLoaded()) {
    loadStatus = MapLoadStatus.LOADED;
    return Promise.resolve();
  }

  // 如果正在加载，返回现有的 Promise
  if (loadStatus === MapLoadStatus.LOADING && loadPromise) {
    return loadPromise;
  }

  // 如果加载失败过，重试
  if (loadStatus === MapLoadStatus.ERROR) {
    loadStatus = MapLoadStatus.NOT_LOADED;
    loadError = null;
  }

  // 检查 AK 配置
  if (!BAIDU_MAP_CONFIG.ak) {
    const error = new Error('百度地图 AK 未配置，请在 .env 文件中设置 VITE_BAIDU_MAP_AK');
    loadStatus = MapLoadStatus.ERROR;
    loadError = error;
    return Promise.reject(error);
  }

  // 开始加载
  loadStatus = MapLoadStatus.LOADING;

  loadPromise = new Promise((resolve, reject) => {
    // 定义全局回调
    window.__baiduMapInitCallback__ = () => {
      loadStatus = MapLoadStatus.LOADED;
      resolve();
      // 通知所有等待的回调
      waitingCallbacks.forEach((cb) => cb.resolve());
      waitingCallbacks.length = 0;
    };

    // 创建 script 标签
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = BAIDU_MAP_CONFIG.sdkUrl;
    script.async = true;

    script.onerror = () => {
      const error = new Error('百度地图 SDK 加载失败');
      loadStatus = MapLoadStatus.ERROR;
      loadError = error;
      reject(error);
      // 通知所有等待的回调
      waitingCallbacks.forEach((cb) => cb.reject(error));
      waitingCallbacks.length = 0;
    };

    // 添加到页面
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * 等待百度地图 SDK 加载完成
 * @returns Promise<void>
 */
export function waitForBaiduMap(): Promise<void> {
  if (isBaiduMapLoaded()) {
    return Promise.resolve();
  }

  if (loadStatus === MapLoadStatus.LOADING) {
    return new Promise((resolve, reject) => {
      waitingCallbacks.push({ resolve, reject });
    });
  }

  return loadBaiduMapSDK();
}

/**
 * 获取 BMap 对象
 * @returns BMap 对象或 null
 */
export function getBMap(): any | null {
  return isBaiduMapLoaded() ? window.BMap : null;
}

/**
 * 重置加载状态（用于测试或重新加载）
 */
export function resetLoadStatus(): void {
  loadStatus = MapLoadStatus.NOT_LOADED;
  loadPromise = null;
  loadError = null;
  waitingCallbacks.length = 0;
}

export default {
  loadBaiduMapSDK,
  waitForBaiduMap,
  isBaiduMapLoaded,
  getLoadStatus,
  getLoadError,
  getBMap,
  resetLoadStatus,
  MapLoadStatus,
};


