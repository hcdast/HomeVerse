import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { loadBaiduMapSDK, isBaiduMapLoaded } from '../utils/mapLoader';
import { BAIDU_MAP_CONFIG, MAP_DEFAULT_CONFIG } from '../config';

// 声明百度地图全局类型
declare global {
  interface Window {
    BMap: any;
    BMapGL: any;
  }
}

interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  color?: string;
  icon?: string;
  info?: {
    title: string;
    address?: string;
    time?: string;
    battery?: number;
    isCharging?: boolean;
  };
}

interface CircleData {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  color?: string;
  name: string;
}

// 路线数据
export interface RouteData {
  id: string;
  userId: string;
  userName?: string;
  color: string;
  points: Array<{
    latitude: number;
    longitude: number;
    recordedAt?: Date;
  }>;
  totalDistance?: number;
  startAddress?: string;
  endAddress?: string;
}

// 选择的位置信息
export interface SelectedLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

interface BaiduMapProps {
  center: [number, number]; // [纬度, 经度]
  zoom?: number;
  markers?: MarkerData[];
  circles?: CircleData[];
  routes?: RouteData[]; // 路线数据
  showRoutes?: boolean; // 是否显示路线
  onMarkerClick?: (marker: MarkerData) => void;
  onCircleClick?: (circle: CircleData) => void;
  onRouteClick?: (route: RouteData) => void;
  onMapReady?: () => void;
  onLoadError?: (error: Error) => void;
  // 选择模式相关
  selectMode?: boolean; // 是否开启选择模式
  selectedLocation?: SelectedLocation | null; // 当前选中的位置
  onLocationSelect?: (location: SelectedLocation) => void; // 位置选择回调
  style?: React.CSSProperties;
  className?: string;
}

export interface BaiduMapRef {
  panTo: (lat: number, lng: number) => void;
  setZoom: (zoom: number) => void;
  getMap: () => any;
  getCenter: () => { lat: number; lng: number } | null;
  enableSelectMode: (enable: boolean) => void;
}

const BaiduMap = forwardRef<BaiduMapRef, BaiduMapProps>(({
  center,
  zoom = MAP_DEFAULT_CONFIG.zoom,
  markers = [],
  circles = [],
  routes = [],
  showRoutes = false,
  onMarkerClick,
  onCircleClick,
  onRouteClick,
  onMapReady,
  onLoadError,
  selectMode = false,
  selectedLocation,
  onLocationSelect,
  style,
  className,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const circlesRef = useRef<any[]>([]);
  const routesRef = useRef<any[]>([]);
  const selectMarkerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  
  // 加载状态
  const [loading, setLoading] = useState(!isBaiduMapLoaded());
  const [error, setError] = useState<string | null>(null);
  const [isSelectModeActive, setIsSelectModeActive] = useState(selectMode);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    panTo: (lat: number, lng: number) => {
      if (mapRef.current && window.BMap) {
        const point = new window.BMap.Point(lng, lat);
        mapRef.current.panTo(point);
      }
    },
    setZoom: (newZoom: number) => {
      if (mapRef.current) {
        mapRef.current.setZoom(newZoom);
      }
    },
    getMap: () => mapRef.current,
    getCenter: () => {
      if (mapRef.current && window.BMap) {
        const center = mapRef.current.getCenter();
        return { lat: center.lat, lng: center.lng };
      }
      return null;
    },
    enableSelectMode: (enable: boolean) => {
      setIsSelectModeActive(enable);
    },
  }));

  // 同步外部 selectMode 属性
  useEffect(() => {
    setIsSelectModeActive(selectMode);
  }, [selectMode]);

  // 加载百度地图 SDK
  useEffect(() => {
    // 检查 AK 配置
    if (!BAIDU_MAP_CONFIG.ak) {
      const errMsg = '百度地图 AK 未配置，请在 .env 文件中设置 VITE_BAIDU_MAP_AK';
      setError(errMsg);
      setLoading(false);
      onLoadError?.(new Error(errMsg));
      return;
    }

    // 如果已加载，直接初始化地图
    if (isBaiduMapLoaded()) {
      setLoading(false);
      return;
    }

    // 动态加载 SDK
    loadBaiduMapSDK()
      .then(() => {
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || '百度地图加载失败');
        setLoading(false);
        onLoadError?.(err);
      });
  }, [onLoadError]);

  // 逆地理编码获取地址
  const getAddressFromPoint = (point: any): Promise<string> => {
    return new Promise((resolve) => {
      if (!geocoderRef.current && window.BMap) {
        geocoderRef.current = new window.BMap.Geocoder();
      }
      if (geocoderRef.current) {
        geocoderRef.current.getLocation(point, (result: any) => {
          if (result) {
            resolve(result.address || '');
          } else {
            resolve('');
          }
        });
      } else {
        resolve('');
      }
    });
  };

  // 处理地图点击选择位置
  const handleMapClick = async (e: any) => {
    if (!isSelectModeActive || !window.BMap) return;

    const point = e.point;
    const address = await getAddressFromPoint(point);

    // 更新选择标记
    updateSelectMarker(point.lat, point.lng);

    // 回调选择的位置
    onLocationSelect?.({
      latitude: point.lat,
      longitude: point.lng,
      address,
    });
  };

  // 更新选择标记
  const updateSelectMarker = (lat: number, lng: number) => {
    if (!mapRef.current || !window.BMap) return;

    // 移除旧的选择标记
    if (selectMarkerRef.current) {
      mapRef.current.removeOverlay(selectMarkerRef.current);
    }

    const point = new window.BMap.Point(lng, lat);

    // 创建选择标记（红色大头针样式）
    const marker = new window.BMap.Marker(point, {
      icon: new window.BMap.Icon(
        `data:image/svg+xml,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="0 0 48 60">
            <defs>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
              </filter>
            </defs>
            <g filter="url(#shadow)">
              <circle cx="24" cy="22" r="20" fill="#e74c3c" stroke="white" stroke-width="3"/>
              <polygon points="24,56 10,32 38,32" fill="#e74c3c"/>
              <circle cx="24" cy="22" r="8" fill="white"/>
            </g>
          </svg>
        `)}`,
        new window.BMap.Size(48, 60),
        { anchor: new window.BMap.Size(24, 60) }
      ),
      enableDragging: true, // 启用拖拽
    });

    // 拖拽结束时更新位置
    marker.addEventListener('dragend', async (e: any) => {
      const newPoint = e.point;
      const address = await getAddressFromPoint(newPoint);
      onLocationSelect?.({
        latitude: newPoint.lat,
        longitude: newPoint.lng,
        address,
      });
    });

    mapRef.current.addOverlay(marker);
    selectMarkerRef.current = marker;
  };

  // 初始化地图
  useEffect(() => {
    if (loading || error || !containerRef.current || !window.BMap) {
      return;
    }

    // 创建地图实例
    const map = new window.BMap.Map(containerRef.current);
    const point = new window.BMap.Point(center[1], center[0]); // 百度地图使用 [经度, 纬度]
    map.centerAndZoom(point, zoom);

    // 启用各种控件
    map.enableScrollWheelZoom(true);
    map.addControl(new window.BMap.NavigationControl());
    map.addControl(new window.BMap.ScaleControl());

    // 初始化地理编码器
    geocoderRef.current = new window.BMap.Geocoder();

    mapRef.current = map;
    onMapReady?.();

    return () => {
      // 清理
      if (mapRef.current) {
        mapRef.current.clearOverlays();
      }
    };
  }, [loading, error]);

  // 监听选择模式变化，添加/移除点击事件
  useEffect(() => {
    if (!mapRef.current) return;

    if (isSelectModeActive) {
      mapRef.current.addEventListener('click', handleMapClick);
      // 改变鼠标样式
      mapRef.current.setDefaultCursor('crosshair');
    } else {
      mapRef.current.removeEventListener('click', handleMapClick);
      mapRef.current.setDefaultCursor('default');
      // 移除选择标记
      if (selectMarkerRef.current) {
        mapRef.current.removeOverlay(selectMarkerRef.current);
        selectMarkerRef.current = null;
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.removeEventListener('click', handleMapClick);
      }
    };
  }, [isSelectModeActive, onLocationSelect]);

  // 当外部传入选中位置时，显示标记
  useEffect(() => {
    if (selectedLocation && isSelectModeActive) {
      updateSelectMarker(selectedLocation.latitude, selectedLocation.longitude);
    }
  }, [selectedLocation, isSelectModeActive]);

  // 更新地图中心
  useEffect(() => {
    if (mapRef.current && window.BMap && center[0] !== 0 && center[1] !== 0) {
      const point = new window.BMap.Point(center[1], center[0]);
      mapRef.current.panTo(point);
    }
  }, [center]);

  // 更新标记
  useEffect(() => {
    if (!mapRef.current || !window.BMap) return;

    // 清除旧标记
    markersRef.current.forEach((marker) => {
      mapRef.current.removeOverlay(marker);
    });
    markersRef.current = [];

    // 添加新标记
    markers.forEach((markerData) => {
      const point = new window.BMap.Point(markerData.longitude, markerData.latitude);

      // 使用自定义覆盖物
      const marker = new window.BMap.Marker(point, {
        icon: new window.BMap.Icon(
          `data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
              <circle cx="20" cy="20" r="18" fill="${markerData.color || '#3498db'}" stroke="white" stroke-width="3"/>
              <polygon points="20,48 8,28 32,28" fill="${markerData.color || '#3498db'}"/>
              <text x="20" y="26" text-anchor="middle" fill="white" font-size="16" font-weight="bold">${markerData.label}</text>
            </svg>
          `)}`,
          new window.BMap.Size(40, 50),
          { anchor: new window.BMap.Size(20, 50) }
        ),
      });

      // 添加信息窗口
      if (markerData.info) {
        const infoContent = `
          <div style="padding: 10px; min-width: 150px;">
            <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #1a1a2e;">${markerData.info.title}</h4>
            ${markerData.info.address ? `<p style="margin: 4px 0; font-size: 13px; color: #666;">📍 ${markerData.info.address}</p>` : ''}
            ${markerData.info.time ? `<p style="margin: 4px 0; font-size: 13px; color: #666;">⏱ ${markerData.info.time}</p>` : ''}
            ${markerData.info.battery !== undefined ? `<p style="margin: 4px 0; font-size: 13px; color: #666;">🔋 ${markerData.info.battery}%${markerData.info.isCharging ? ' ⚡' : ''}</p>` : ''}
          </div>
        `;
        const infoWindow = new window.BMap.InfoWindow(infoContent, {
          width: 200,
          title: '',
        });

        marker.addEventListener('click', () => {
          mapRef.current.openInfoWindow(infoWindow, point);
          onMarkerClick?.(markerData);
        });
      }

      mapRef.current.addOverlay(marker);
      markersRef.current.push(marker);
    });
  }, [markers, onMarkerClick]);

  // 更新圆形区域
  useEffect(() => {
    if (!mapRef.current || !window.BMap) return;

    // 清除旧圆形
    circlesRef.current.forEach((circle) => {
      mapRef.current.removeOverlay(circle);
    });
    circlesRef.current = [];

    // 添加新圆形
    circles.forEach((circleData) => {
      const point = new window.BMap.Point(circleData.longitude, circleData.latitude);
      const color = circleData.color || '#27ae60';

      const circle = new window.BMap.Circle(point, circleData.radius, {
        strokeColor: color,
        strokeWeight: 2,
        strokeOpacity: 0.8,
        fillColor: color,
        fillOpacity: 0.2,
      });

      circle.addEventListener('click', () => {
        const infoWindow = new window.BMap.InfoWindow(`
          <div style="padding: 10px;">
            <h4 style="margin: 0 0 8px 0;">${circleData.name}</h4>
            <p style="margin: 4px 0; font-size: 13px; color: #666;">📏 半径: ${circleData.radius}米</p>
          </div>
        `, { width: 150 });
        mapRef.current.openInfoWindow(infoWindow, point);
        onCircleClick?.(circleData);
      });

      mapRef.current.addOverlay(circle);
      circlesRef.current.push(circle);

      // 添加安全区域标记
      const zoneMarker = new window.BMap.Marker(point, {
        icon: new window.BMap.Icon(
          `data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="${color}" stroke="white" stroke-width="3"/>
              <text x="18" y="24" text-anchor="middle" font-size="16">🏠</text>
            </svg>
          `)}`,
          new window.BMap.Size(36, 36),
          { anchor: new window.BMap.Size(18, 18) }
        ),
      });

      mapRef.current.addOverlay(zoneMarker);
      circlesRef.current.push(zoneMarker);
    });
  }, [circles, onCircleClick]);

  // 绘制路线
  useEffect(() => {
    if (!mapRef.current || !window.BMap || !showRoutes) return;

    // 清除旧路线
    routesRef.current.forEach((overlay) => {
      mapRef.current.removeOverlay(overlay);
    });
    routesRef.current = [];

    // 绘制新路线
    routes.forEach((routeData) => {
      if (!routeData.points || routeData.points.length < 2) return;

      // 创建路径点
      const pathPoints = routeData.points.map(
        (p) => new window.BMap.Point(p.longitude, p.latitude)
      );

      // 绘制折线
      const polyline = new window.BMap.Polyline(pathPoints, {
        strokeColor: routeData.color || '#3498db',
        strokeWeight: 4,
        strokeOpacity: 0.8,
        strokeStyle: 'solid',
      });

      polyline.addEventListener('click', () => {
        const midIndex = Math.floor(pathPoints.length / 2);
        const midPoint = pathPoints[midIndex];
        const distanceKm = routeData.totalDistance 
          ? (routeData.totalDistance / 1000).toFixed(2) 
          : '未知';
        
        const infoWindow = new window.BMap.InfoWindow(`
          <div style="padding: 12px; min-width: 180px;">
            <h4 style="margin: 0 0 10px 0; font-size: 15px; color: #1a1a2e; display: flex; align-items: center; gap: 8px;">
              <span style="width: 12px; height: 12px; background: ${routeData.color}; border-radius: 50%; display: inline-block;"></span>
              ${routeData.userName || '用户'} 的轨迹
            </h4>
            <p style="margin: 6px 0; font-size: 13px; color: #666;">📍 起点: ${routeData.startAddress || '未知'}</p>
            <p style="margin: 6px 0; font-size: 13px; color: #666;">🏁 终点: ${routeData.endAddress || '未知'}</p>
            <p style="margin: 6px 0; font-size: 13px; color: #666;">📏 距离: ${distanceKm} 公里</p>
            <p style="margin: 6px 0; font-size: 13px; color: #666;">📊 记录点: ${routeData.points.length} 个</p>
          </div>
        `, { width: 220 });
        mapRef.current.openInfoWindow(infoWindow, midPoint);
        onRouteClick?.(routeData);
      });

      mapRef.current.addOverlay(polyline);
      routesRef.current.push(polyline);

      // 添加起点标记
      if (pathPoints.length > 0) {
        const startMarker = new window.BMap.Marker(pathPoints[0], {
          icon: new window.BMap.Icon(
            `data:image/svg+xml,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="${routeData.color}" stroke="white" stroke-width="2"/>
                <text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="bold">起</text>
              </svg>
            `)}`,
            new window.BMap.Size(24, 24),
            { anchor: new window.BMap.Size(12, 12) }
          ),
        });
        mapRef.current.addOverlay(startMarker);
        routesRef.current.push(startMarker);
      }

      // 添加终点标记
      if (pathPoints.length > 1) {
        const endMarker = new window.BMap.Marker(pathPoints[pathPoints.length - 1], {
          icon: new window.BMap.Icon(
            `data:image/svg+xml,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="${routeData.color}" stroke="white" stroke-width="2"/>
                <text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="bold">终</text>
              </svg>
            `)}`,
            new window.BMap.Size(24, 24),
            { anchor: new window.BMap.Size(12, 12) }
          ),
        });
        mapRef.current.addOverlay(endMarker);
        routesRef.current.push(endMarker);
      }
    });
  }, [routes, showRoutes, onRouteClick]);

  // 加载中状态
  if (loading) {
    return (
      <div
        className={className}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          borderRadius: '16px',
          ...style,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e0e0e0',
              borderTopColor: '#3498db',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ color: '#666', margin: 0 }}>地图加载中...</p>
        </div>
        <style>
          {`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div
        className={className}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%)',
          borderRadius: '16px',
          ...style,
        }}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
          <h3 style={{ color: '#e74c3c', margin: '0 0 8px' }}>地图加载失败</h3>
          <p style={{ color: '#666', margin: '0 0 16px', maxWidth: '300px' }}>{error}</p>
          <div
            style={{
              background: '#f8f9fa',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#555',
              textAlign: 'left',
            }}
          >
            <strong>配置步骤：</strong>
            <ol style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
              <li>创建 <code>.env</code> 文件</li>
              <li>添加 <code>VITE_BAIDU_MAP_AK=您的AK</code></li>
              <li>重启开发服务器</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={containerRef}
        className={className}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '16px',
          ...style,
        }}
      />
      {/* 选择模式提示 */}
      {isSelectModeActive && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(231, 76, 60, 0.95)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '18px' }}>📍</span>
          点击地图选择位置，或拖动标记调整
        </div>
      )}
    </div>
  );
});

BaiduMap.displayName = 'BaiduMap';

export default BaiduMap;
