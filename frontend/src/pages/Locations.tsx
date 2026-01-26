import { useState, useEffect, useRef } from 'react';
import api from '@/services/api';
import useConfirm from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import BaiduMap, { BaiduMapRef, SelectedLocation, RouteData } from '@/components/BaiduMap';
import './Locations.css';

interface LocationData {
  _id: string;
  userId: { _id: string; username: string; avatar?: string };
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  address?: string;
  province?: string;
  city?: string;
  district?: string;
  street?: string;
  streetNumber?: string;
  poiName?: string;
  poiType?: string;
  isSharing: boolean;
  isManual?: boolean;
  battery?: number;
  isCharging?: boolean;
  networkType?: string;
  lastUpdatedAt: string;
  // 今日统计
  todayHistoryCount?: number;
  todayDistance?: number;
  todayDuration?: number;
}

interface LocationHistoryItem {
  _id: string;
  latitude: number;
  longitude: number;
  address?: string;
  poiName?: string;
  speed?: number;
  recordedAt: string;
}

interface SafeZone {
  _id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  address?: string;
  icon?: string;
  color?: string;
  notifyOnEnter: boolean;
  notifyOnExit: boolean;
  watchedMembers: { _id: string; username: string }[];
  isActive: boolean;
}

interface DailyRouteData {
  _id: string;
  userId: { _id: string; username: string; avatar?: string } | string;
  dateKey: string;
  points: Array<{
    latitude: number;
    longitude: number;
    address?: string;
    poiName?: string;
    recordedAt: string;
    speed?: number;
  }>;
  totalDistance: number;
  duration: number;
  startAddress?: string;
  endAddress?: string;
  color: string;
}

interface LocationSettings {
  autoUpdateEnabled: boolean;
  updateIntervalMinutes: number;
  saveHistory: boolean;
  showDetailedAddress: boolean;
}

// 用户颜色
const userColors = [
  '#3498db', '#e74c3c', '#27ae60', '#9b59b6', '#f39c12',
  '#1abc9c', '#e91e63', '#00bcd4', '#ff5722', '#795548'
];

// 视图模式
type ViewMode = 'realtime' | 'routes';

// 选择模式类型
type SelectMode = 'none' | 'share' | 'safeZone';

const Locations = () => {
  const [familyLocations, setFamilyLocations] = useState<LocationData[]>([]);
  const [, setMyLocation] = useState<LocationData | null>(null);
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  const [dailyRoutes, setDailyRoutes] = useState<DailyRouteData[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<LocationData | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.9042, 116.4074]);
  const [settings, setSettings] = useState<LocationSettings>({
    autoUpdateEnabled: true,
    updateIntervalMinutes: 30,
    saveHistory: true,
    showDetailedAddress: true,
  });
  
  // 视图和选择模式状态
  const [viewMode, setViewMode] = useState<ViewMode>('realtime');
  const [selectMode, setSelectMode] = useState<SelectMode>('none');
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // 展开的成员历史记录
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [memberHistory, setMemberHistory] = useState<LocationHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // 展开的行程轨迹坐标点
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  // 缓存补充获取的地址 { `${routeId}-${pointIndex}`: address }
  const [pointAddressCache, setPointAddressCache] = useState<Record<string, string>>({});
  const [loadingPointAddresses, setLoadingPointAddresses] = useState(false);
  
  const mapRef = useRef<BaiduMapRef>(null);
  const watchIdRef = useRef<number | null>(null);
  const autoUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { toast, hideToast, success, error } = useToast();

  const [zoneForm, setZoneForm] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius: '100',
    address: '',
    icon: '🏠',
    color: '#27ae60',
    notifyOnEnter: true,
    notifyOnExit: true,
  });

  // 初始化和加载数据
  useEffect(() => {
    loadData();
    loadSettings();
    getCurrentLocation();
    
    // 清理函数
    return () => {
      stopAutoUpdate();
    };
  }, []);

  // 根据设置启动/停止自动位置更新
  useEffect(() => {
    if (settings.autoUpdateEnabled && isSharing) {
      startAutoUpdate();
    } else {
      stopAutoUpdate();
    }
    
    return () => {
      stopAutoUpdate();
    };
  }, [settings.autoUpdateEnabled, settings.updateIntervalMinutes, isSharing]);

  // 切换视图时加载对应数据
  useEffect(() => {
    if (viewMode === 'routes') {
      loadDailyRoutes(selectedDate);
    } else {
      // 实时模式下也加载今日轨迹用于显示
      loadDailyRoutes(new Date().toISOString().split('T')[0]);
    }
  }, [viewMode, selectedDate]);

  // 使用百度地图逆地理编码获取地址
  const getAddressFromCoords = (latitude: number, longitude: number): Promise<{ address: string; poiName?: string }> => {
    return new Promise((resolve) => {
      // 检查百度地图 SDK 是否可用
      if (typeof window !== 'undefined' && (window as any).BMap) {
        const BMap = (window as any).BMap;
        const geocoder = new BMap.Geocoder();
        const point = new BMap.Point(longitude, latitude); // 百度地图是经度在前
        
        geocoder.getLocation(point, (result: any) => {
          if (result) {
            // 获取最近的兴趣点
            let poiName = '';
            if (result.surroundingPois && result.surroundingPois.length > 0) {
              poiName = result.surroundingPois[0].title;
            } else if (result.business) {
              poiName = result.business;
            }
            
            resolve({
              address: result.address || '',
              poiName: poiName || result.addressComponents?.street || '',
            });
          } else {
            resolve({ address: '', poiName: '' });
          }
        });
      } else {
        resolve({ address: '', poiName: '' });
      }
    });
  };

  // 展开行程轨迹时批量获取缺失的地址
  const fetchMissingPointAddresses = async (routeId: string, points: any[]) => {
    if (!points || points.length === 0) return;
    
    // 找出没有地址的点
    const missingPoints = points
      .map((point, idx) => ({ point, idx }))
      .filter(({ point, idx }) => {
        const cacheKey = `${routeId}-${idx}`;
        return !point.address && !point.poiName && !pointAddressCache[cacheKey];
      });
    
    if (missingPoints.length === 0) return;
    
    setLoadingPointAddresses(true);
    
    // 批量获取地址（限制并发数量避免请求过多）
    const batchSize = 5;
    const newCache: Record<string, string> = {};
    
    for (let i = 0; i < missingPoints.length; i += batchSize) {
      const batch = missingPoints.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async ({ point, idx }) => {
          const addressInfo = await getAddressFromCoords(point.latitude, point.longitude);
          return {
            key: `${routeId}-${idx}`,
            address: addressInfo.poiName || addressInfo.address || `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`,
          };
        })
      );
      
      results.forEach(({ key, address }) => {
        newCache[key] = address;
      });
    }
    
    setPointAddressCache(prev => ({ ...prev, ...newCache }));
    setLoadingPointAddresses(false);
  };

  // 处理展开/收起行程轨迹
  const handleToggleRoute = (route: any) => {
    const isExpanding = expandedRouteId !== route._id;
    setExpandedRouteId(isExpanding ? route._id : null);
    
    if (isExpanding) {
      // 展开时获取缺失的地址
      fetchMissingPointAddresses(route._id, route.points);
    }
  };

  // 获取坐标点的显示地址
  const getPointDisplayAddress = (routeId: string, point: any, idx: number): string => {
    if (point.poiName) return point.poiName;
    if (point.address) return point.address;
    
    const cacheKey = `${routeId}-${idx}`;
    if (pointAddressCache[cacheKey]) return pointAddressCache[cacheKey];
    
    return `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`;
  };

  // 启动自动位置更新
  const startAutoUpdate = () => {
    // 清除旧的定时器
    stopAutoUpdate();
    
    if (!navigator.geolocation) {
      console.warn('浏览器不支持地理位置功能');
      return;
    }

    console.log(`启动自动位置更新，间隔: ${settings.updateIntervalMinutes} 分钟`);

    // 使用 watchPosition 持续获取位置
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;
        
        try {
          // 获取地址信息
          const addressInfo = await getAddressFromCoords(latitude, longitude);
          
          await api.post('/locations/update', {
            latitude,
            longitude,
            accuracy,
            altitude,
            speed,
            heading,
            address: addressInfo.address,
            poiName: addressInfo.poiName,
          });
          // 静默更新数据，不显示提示
          loadData();
          // 更新今日轨迹
          loadDailyRoutes(new Date().toISOString().split('T')[0]);
        } catch (err) {
          console.error('自动更新位置失败:', err);
        }
      },
      (err) => {
        console.error('获取位置失败:', err);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: settings.updateIntervalMinutes * 60 * 1000, // 根据设置的间隔缓存位置
      }
    );

    // 另外设置定时器定期强制上报（确保按间隔存储）
    autoUpdateIntervalRef.current = setInterval(() => {
      if (isSharing) {
        forceUpdateLocation();
      }
    }, settings.updateIntervalMinutes * 60 * 1000);
  };

  // 停止自动位置更新
  const stopAutoUpdate = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (autoUpdateIntervalRef.current !== null) {
      clearInterval(autoUpdateIntervalRef.current);
      autoUpdateIntervalRef.current = null;
    }
  };

  // 强制更新位置
  const forceUpdateLocation = () => {
    if (!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;
        
        try {
          // 获取地址信息
          const addressInfo = await getAddressFromCoords(latitude, longitude);
          
          await api.post('/locations/update', {
            latitude,
            longitude,
            accuracy,
            altitude,
            speed,
            heading,
            address: addressInfo.address,
            poiName: addressInfo.poiName,
          });
          loadData();
          loadDailyRoutes(new Date().toISOString().split('T')[0]);
        } catch (err) {
          console.error('强制更新位置失败:', err);
        }
      },
      (err) => {
        console.error('获取位置失败:', err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const loadData = async () => {
    try {
      const [familyRes, zonesRes] = await Promise.all([
        api.get('/locations/family'),
        api.get('/locations/safe-zones'),
      ]);
      const locations = Array.isArray(familyRes.data) ? familyRes.data : [];
      setFamilyLocations(locations);
      setSafeZones(Array.isArray(zonesRes.data) ? zonesRes.data : []);

      if (locations.length > 0) {
        setMapCenter([locations[0].latitude, locations[0].longitude]);
      }

      try {
        const myRes = await api.get('/locations/my');
        setMyLocation(myRes.data);
        setIsSharing(myRes.data?.isSharing || false);
        if (myRes.data?.latitude && myRes.data?.longitude) {
          setMapCenter([myRes.data.latitude, myRes.data.longitude]);
        }
      } catch {
        // 可能还没有位置记录
      }
    } catch (err) {
      console.error('加载数据失败:', err);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await api.get('/locations/settings');
      if (res.data) {
        setSettings(res.data);
      }
    } catch (err) {
      console.error('加载设置失败:', err);
    }
  };

  const loadDailyRoutes = async (dateKey: string) => {
    try {
      const res = await api.get(`/locations/routes/date/${dateKey}`);
      setDailyRoutes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('加载路线失败:', err);
    }
  };
  const getCurrentLocation = (forceSave = true) => {
    if (!navigator.geolocation) {
      error('您的浏览器不支持地理位置功能');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;
        setMapCenter([latitude, longitude]);

        try {
          // 获取地址信息
          const addressInfo = await getAddressFromCoords(latitude, longitude);
          
          await api.post('/locations/update', {
            latitude,
            longitude,
            accuracy,
            altitude,
            speed,
            heading,
            address: addressInfo.address,
            poiName: addressInfo.poiName,
            forceSave, // 强制保存到历史记录
          });
          loadData();
          // 刷新今日轨迹
          loadDailyRoutes(new Date().toISOString().split('T')[0]);
          if (forceSave) {
            success('位置已更新并记录');
          }
        } catch (err) {
          console.error('更新位置失败:', err);
        }
      },
      (err) => {
        console.error('获取位置失败:', err);
        error('获取位置失败，请检查定位权限');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleToggleSharing = async () => {
    try {
      const res = await api.put('/locations/sharing/toggle');
      setIsSharing(res.data?.isSharing || false);
      success(res.data?.isSharing ? '已开启位置分享' : '已关闭位置分享');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '操作失败');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await api.put('/locations/settings', settings);
      success('设置已保存');
      setShowSettingsModal(false);
    } catch (err: any) {
      console.error('保存设置失败:', err);
      error(err.response?.data?.message || err.message || '保存失败，请重试');
      // 即使报错也关闭弹窗，让用户可以继续使用
      setShowSettingsModal(false);
    }
  };

  // 开启选择模式
  const startSelectMode = (mode: SelectMode) => {
    setSelectMode(mode);
    setSelectedLocation(null);
    if (mode === 'share') {
      success('点击地图选择要分享的位置');
    } else if (mode === 'safeZone') {
      success('点击地图选择安全区域中心点');
    }
  };

  // 取消选择模式
  const cancelSelectMode = () => {
    setSelectMode('none');
    setSelectedLocation(null);
  };

  // 处理位置选择
  const handleLocationSelect = (location: SelectedLocation) => {
    setSelectedLocation(location);
    
    // 如果是创建安全区域模式，自动填充表单
    if (selectMode === 'safeZone') {
      setZoneForm(prev => ({
        ...prev,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        address: location.address || '',
      }));
    }
  };

  // 确认分享位置
  const confirmShareLocation = async () => {
    if (!selectedLocation) return;

    try {
      await api.post('/locations/update', {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        address: selectedLocation.address,
        isManual: true,
      });
      cancelSelectMode();
      success('位置分享成功！');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '分享失败');
    }
  };

  // 确认创建安全区域
  const confirmCreateZone = () => {
    if (!selectedLocation) return;
    setShowZoneModal(true);
  };

  const handleCreateZone = async () => {
    if (!zoneForm.name || !zoneForm.latitude || !zoneForm.longitude) {
      error('请填写区域名称和位置');
      return;
    }

    try {
      await api.post('/locations/safe-zones', {
        ...zoneForm,
        latitude: parseFloat(zoneForm.latitude),
        longitude: parseFloat(zoneForm.longitude),
        radius: parseInt(zoneForm.radius),
      });
      success('安全区域创建成功');
      loadData();
    } catch (err: any) {
      console.error('创建安全区域失败:', err);
      error(err.response?.data?.message || err.message || '创建失败');
    } finally {
      // 无论成功失败都关闭弹窗和重置状态
      setShowZoneModal(false);
      cancelSelectMode();
      setZoneForm({
        name: '',
        latitude: '',
        longitude: '',
        radius: '100',
        address: '',
        icon: '🏠',
        color: '#27ae60',
        notifyOnEnter: true,
        notifyOnExit: true,
      });
    }
  };

  const handleDeleteZone = async (id: string) => {
    const confirmed = await confirm({
      title: '删除安全区域',
      message: '确定要删除此安全区域吗？',
      confirmText: '删除',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/locations/safe-zones/${id}`);
      success('已删除');
      loadData();
    } catch (err: any) {
      error(err.response?.data?.message || '删除失败');
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return date.toLocaleDateString();
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} 米`;
    return `${(meters / 1000).toFixed(2)} 公里`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
  };

  const focusOnMember = (member: LocationData) => {
    setSelectedMember(member);
    setMapCenter([member.latitude, member.longitude]);
    mapRef.current?.panTo(member.latitude, member.longitude);
  };

  // 切换展开成员历史记录
  const toggleMemberHistory = async (memberId: string) => {
    if (expandedMemberId === memberId) {
      // 收起
      setExpandedMemberId(null);
      setMemberHistory([]);
    } else {
      // 展开并加载历史
      setExpandedMemberId(memberId);
      setLoadingHistory(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await api.get(`/locations/history/${memberId}?startDate=${today}T00:00:00&endDate=${today}T23:59:59&limit=50`);
        setMemberHistory(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('加载历史记录失败:', err);
        setMemberHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    }
  };

  // 格式化历史记录时间
  const formatHistoryTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const focusOnZone = (zone: SafeZone) => {
    setMapCenter([zone.latitude, zone.longitude]);
    mapRef.current?.panTo(zone.latitude, zone.longitude);
  };

  const getUserColor = (index: number) => userColors[index % userColors.length];

  // 构建详细地址显示
  const getDetailedAddress = (loc: LocationData) => {
    if (loc.poiName) return loc.poiName;
    if (loc.address) return loc.address;
    
    const parts = [loc.city, loc.district, loc.street, loc.streetNumber].filter(Boolean);
    if (parts.length > 0) return parts.join('');
    
    return `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`;
  };

  // 转换为地图标记数据
  const mapMarkers = familyLocations.map((loc, index) => ({
    id: loc._id,
    latitude: loc.latitude,
    longitude: loc.longitude,
    label: loc.userId?.username?.charAt(0)?.toUpperCase() || '?',
    color: getUserColor(index),
    info: {
      title: loc.userId?.username || '未知',
      address: getDetailedAddress(loc),
      time: formatTime(loc.lastUpdatedAt),
      battery: loc.battery,
      isCharging: loc.isCharging,
    },
  }));

  // 转换为地图圆形数据
  const mapCircles = safeZones.map((zone) => ({
    id: zone._id,
    latitude: zone.latitude,
    longitude: zone.longitude,
    radius: zone.radius,
    color: zone.color || '#27ae60',
    name: zone.name,
  }));

  // 转换为路线数据
  const mapRoutes: RouteData[] = dailyRoutes.map((route) => ({
    id: route._id,
    userId: typeof route.userId === 'object' ? route.userId._id : route.userId,
    userName: typeof route.userId === 'object' ? route.userId.username : undefined,
    color: route.color,
    points: route.points.map(p => ({
      latitude: p.latitude,
      longitude: p.longitude,
      recordedAt: new Date(p.recordedAt),
    })),
    totalDistance: route.totalDistance,
    startAddress: route.startAddress,
    endAddress: route.endAddress,
  }));

  // 图标选项
  const iconOptions = ['🏠', '🏢', '🏫', '🏥', '🏪', '⛪', '🎭', '🏟️', '🎢', '🌳'];
  const colorOptions = ['#27ae60', '#3498db', '#e74c3c', '#9b59b6', '#f39c12', '#1abc9c'];

  return (
    <div className="locations-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">📍 位置分享</h1>
          <p className="page-subtitle">随时了解家人位置，守护家人安全</p>
        </div>
        <div className="header-actions">
          <button
            className={`btn-sharing ${isSharing ? 'on' : 'off'}`}
            onClick={handleToggleSharing}
          >
            {isSharing ? '🔵 位置分享中' : '⚪ 开启分享'}
          </button>
          <button className="btn-refresh" onClick={() => getCurrentLocation()}>
            🔄 刷新
          </button>
          <button className="btn-settings" onClick={() => setShowSettingsModal(true)}>
            ⚙️
          </button>
        </div>
      </div>

      {/* 视图切换和操作栏 */}
      <div className="view-toolbar">
        <div className="view-tabs">
          <button 
            className={`view-tab ${viewMode === 'realtime' ? 'active' : ''}`}
            onClick={() => setViewMode('realtime')}
          >
            📍 实时位置
          </button>
          <button 
            className={`view-tab ${viewMode === 'routes' ? 'active' : ''}`}
            onClick={() => setViewMode('routes')}
          >
            🛤️ 行程轨迹
          </button>
        </div>
        
        {viewMode === 'realtime' && selectMode === 'none' && (
          <div className="action-buttons">
            <button className="btn-action share" onClick={() => startSelectMode('share')}>
              ✋ 手动分享位置
            </button>
            <button className="btn-action zone" onClick={() => startSelectMode('safeZone')}>
              🛡️ 添加安全区域
            </button>
          </div>
        )}
        
        {viewMode === 'routes' && (
          <div className="date-picker">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        )}
      </div>

      {/* 选择模式工具栏 */}
      {selectMode !== 'none' && (
        <div className="select-toolbar">
          <div className="select-info">
            <span className="select-icon">{selectMode === 'share' ? '📍' : '🛡️'}</span>
            <div className="select-text">
              <strong>{selectMode === 'share' ? '选择分享位置' : '选择安全区域中心'}</strong>
              {selectedLocation ? (
                <span className="selected-address">
                  {selectedLocation.address || `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`}
                </span>
              ) : (
                <span className="hint">点击地图或拖动标记选择位置</span>
              )}
            </div>
          </div>
          <div className="select-actions">
            {selectedLocation && (
              <button 
                className="btn-confirm"
                onClick={selectMode === 'share' ? confirmShareLocation : confirmCreateZone}
              >
                {selectMode === 'share' ? '✓ 分享此位置' : '✓ 设置安全区域'}
              </button>
            )}
            <button className="btn-cancel" onClick={cancelSelectMode}>
              取消
            </button>
          </div>
        </div>
      )}

      <div className="locations-layout">
        {/* 左侧 - 地图和位置列表 */}
        <div className="locations-main">
          {/* 地图视图 */}
          <div className="map-container">
            <BaiduMap
              ref={mapRef}
              center={mapCenter}
              zoom={15}
              markers={viewMode === 'realtime' ? mapMarkers : []}
              circles={mapCircles}
              routes={mapRoutes}
              showRoutes={true}
              selectMode={selectMode !== 'none'}
              selectedLocation={selectedLocation}
              onLocationSelect={handleLocationSelect}
              onMarkerClick={(marker) => {
                if (selectMode === 'none') {
                  const member = familyLocations.find(l => l._id === marker.id);
                  if (member) setSelectedMember(member);
                }
              }}
            />
            <div className="map-legend">
              {viewMode === 'realtime' && (
                <>
                  <span className="legend-item">
                    <span className="legend-dot" style={{ background: '#3498db' }} /> 家人位置
                  </span>
                  <span className="legend-item">
                    <span className="legend-dot" style={{ background: '#27ae60' }} /> 安全区域
                  </span>
                </>
              )}
              {viewMode === 'routes' && dailyRoutes.map((route) => (
                <span key={route._id} className="legend-item">
                  <span className="legend-dot" style={{ background: route.color }} />
                  {typeof route.userId === 'object' ? route.userId.username : '用户'}
                </span>
              ))}
            </div>
          </div>

          {/* 家人位置列表 / 轨迹列表 */}
          {viewMode === 'realtime' ? (
            <div className="members-section">
              <h3>👨‍👩‍👧‍👦 家人位置</h3>
              {familyLocations.length === 0 ? (
                <div className="empty-state">
                  <p>暂无成员分享位置</p>
                </div>
              ) : (
                <div className="members-list">
                  {familyLocations.map((loc, index) => (
                    <div key={loc._id} className="member-item-wrapper">
                      <div
                        className={`member-card ${selectedMember?._id === loc._id ? 'selected' : ''}`}
                        onClick={() => focusOnMember(loc)}
                      >
                      <div 
                        className="member-avatar"
                        style={{ background: getUserColor(index) }}
                      >
                        {loc.userId?.avatar ? (
                          <img src={loc.userId.avatar} alt="" />
                        ) : (
                          <span>{loc.userId?.username?.charAt(0) || '?'}</span>
                        )}
                        <div className={`status-dot ${loc.isSharing ? 'online' : 'offline'}`} />
                      </div>
                      <div className="member-info">
                        <h4>
                          {loc.userId?.username}
                          {loc.isManual && <span className="manual-tag">手动</span>}
                        </h4>
                        <p className="member-address">
                          📍 {getDetailedAddress(loc)}
                        </p>
                        {loc.poiName && loc.address && (
                          <p className="member-address-detail">
                            {loc.address}
                          </p>
                        )}
                        <div className="member-meta">
                          <span className="update-time">⏱ {formatTime(loc.lastUpdatedAt)}</span>
                          {loc.battery !== undefined && (
                            <span className="battery">
                              {loc.battery > 80 ? '🔋' : loc.battery > 20 ? '🪫' : '🔴'} {loc.battery}%
                              {loc.isCharging && ' ⚡'}
                            </span>
                          )}
                          {loc.speed !== undefined && loc.speed > 0 && (
                            <span className="speed">🚀 {Math.round(loc.speed * 3.6)} km/h</span>
                          )}
                        </div>
                        {/* 今日轨迹统计 */}
                        {(loc.todayHistoryCount !== undefined && loc.todayHistoryCount > 0) && (
                          <div className="member-today-stats">
                            <button 
                              className="today-stat-btn"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                toggleMemberHistory(loc.userId._id); 
                              }}
                            >
                              📊 今日 {loc.todayHistoryCount} 条记录
                              <span className="expand-icon">
                                {expandedMemberId === loc.userId._id ? '▲' : '▼'}
                              </span>
                            </button>
                            {loc.todayDistance !== undefined && loc.todayDistance > 0 && (
                              <span className="today-stat">
                                📏 {formatDistance(loc.todayDistance)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <button className="btn-locate" onClick={(e) => { e.stopPropagation(); focusOnMember(loc); }}>
                        🎯
                      </button>
                    </div>
                    {/* 展开的历史记录列表 */}
                    {expandedMemberId === loc.userId._id && (
                      <div className="member-history-list">
                        {loadingHistory ? (
                          <div className="history-loading">加载中...</div>
                        ) : memberHistory.length === 0 ? (
                          <div className="history-empty">暂无记录</div>
                        ) : (
                          memberHistory.map((item, idx) => (
                            <div 
                              key={item._id} 
                              className="history-item"
                              onClick={() => {
                                setMapCenter([item.latitude, item.longitude]);
                                mapRef.current?.panTo(item.latitude, item.longitude);
                              }}
                            >
                              <span className="history-index">{idx + 1}</span>
                              <div className="history-info">
                                <span className="history-time">{formatHistoryTime(item.recordedAt)}</span>
                                <span className="history-address">
                                  📍 {item.poiName || item.address || `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`}
                                </span>
                              </div>
                              {item.speed !== undefined && item.speed > 0 && (
                                <span className="history-speed">🚀 {Math.round(item.speed * 3.6)} km/h</span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="routes-section">
              <h3>🛤️ {selectedDate} 行程轨迹</h3>
              {dailyRoutes.length === 0 ? (
                <div className="empty-state">
                  <p>该日期暂无行程记录</p>
                </div>
              ) : (
                <div className="routes-list">
                  {dailyRoutes.map((route) => {
                    const isExpanded = expandedRouteId === route._id;
                    return (
                      <div key={route._id} className="route-card">
                        <div 
                          className="route-color-bar"
                          style={{ background: route.color }}
                        />
                        <div className="route-info">
                          <h4>
                            <span 
                              className="route-user-dot" 
                              style={{ background: route.color }}
                            />
                            {typeof route.userId === 'object' ? route.userId.username : '用户'}
                          </h4>
                          <div className="route-detail">
                            <span>📍 {route.startAddress || '起点'}</span>
                            <span className="route-arrow">→</span>
                            <span>🏁 {route.endAddress || '终点'}</span>
                          </div>
                          <div className="route-stats">
                            <span>📏 {formatDistance(route.totalDistance)}</span>
                            <span>⏱ {formatDuration(route.duration)}</span>
                            <button 
                              className="route-points-toggle"
                              onClick={() => handleToggleRoute(route)}
                            >
                              📊 {route.points.length} 个记录点 {isExpanded ? '▲' : '▼'}
                            </button>
                          </div>
                          
                          {/* 展开的坐标点列表 */}
                          {isExpanded && route.points.length > 0 && (
                            <div className="route-points-list">
                              <div className="points-header">
                                <span>序号</span>
                                <span>时间</span>
                                <span>位置 {loadingPointAddresses && <span className="loading-hint">（正在获取地址...）</span>}</span>
                              </div>
                              {route.points.map((point: any, idx: number) => (
                                <div 
                                  key={idx} 
                                  className="route-point-item"
                                  onClick={() => {
                                    setMapCenter([point.latitude, point.longitude]);
                                    mapRef.current?.panTo(point.latitude, point.longitude);
                                  }}
                                >
                                  <span className="point-index" style={{ background: route.color }}>
                                    {idx + 1}
                                  </span>
                                  <span className="point-time">
                                    {point.recordedAt ? new Date(point.recordedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                                  </span>
                                  <span className="point-address">
                                    {getPointDisplayAddress(route._id, point, idx)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右侧 - 安全区域和设置 */}
        <div className="locations-sidebar">
          <div className="sidebar-card">
            <div className="sidebar-header">
              <h3>🛡️ 安全区域</h3>
            </div>

            {safeZones.length === 0 ? (
              <div className="empty-zones">
                <div className="empty-icon">🏠</div>
                <p>点击"添加安全区域"按钮</p>
                <p className="sub">在地图上选择位置创建</p>
              </div>
            ) : (
              <div className="zones-list">
                {safeZones.map((zone) => (
                  <div 
                    key={zone._id} 
                    className="zone-card"
                    onClick={() => focusOnZone(zone)}
                  >
                    <div className="zone-icon" style={{ backgroundColor: zone.color || '#27ae60' }}>
                      {zone.icon || '🏠'}
                    </div>
                    <div className="zone-info">
                      <h4>{zone.name}</h4>
                      <p>{zone.address || `半径 ${zone.radius}m`}</p>
                      <div className="zone-settings">
                        {zone.notifyOnEnter && <span className="notify-tag">进入提醒</span>}
                        {zone.notifyOnExit && <span className="notify-tag">离开提醒</span>}
                      </div>
                    </div>
                    <button
                      className="btn-delete-zone"
                      onClick={(e) => { e.stopPropagation(); handleDeleteZone(zone._id); }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 存储设置提示 */}
          <div className="storage-notice">
            <h4>⏱ 定时存储</h4>
            <p>当前设置：每 <strong>{settings.updateIntervalMinutes}</strong> 分钟存储一次位置</p>
            <p className="sub">位置历史保留30天</p>
          </div>

          {/* 隐私说明 */}
          <div className="privacy-notice">
            <h4>🔒 隐私保护</h4>
            <ul>
              <li>位置信息仅家庭成员可见</li>
              <li>可随时关闭位置分享</li>
              <li>位置历史30天后自动删除</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 创建安全区域模态框 */}
      {showZoneModal && (
        <div className="modal-overlay" onClick={() => setShowZoneModal(false)}>
          <div className="modal-content zone-modal" onClick={(e) => e.stopPropagation()}>
            <h2>添加安全区域</h2>

            <div className="form-group">
              <label>区域名称</label>
              <input
                type="text"
                value={zoneForm.name}
                onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                placeholder="如：家、公司、学校"
              />
            </div>

            <div className="form-group">
              <label>位置</label>
              <div className="location-display">
                <span>📍 {zoneForm.address || `${parseFloat(zoneForm.latitude || '0').toFixed(4)}, ${parseFloat(zoneForm.longitude || '0').toFixed(4)}`}</span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>半径（米）</label>
                <input
                  type="number"
                  value={zoneForm.radius}
                  onChange={(e) => setZoneForm({ ...zoneForm, radius: e.target.value })}
                  placeholder="100"
                  min="50"
                  max="5000"
                />
              </div>
            </div>

            <div className="form-group">
              <label>图标</label>
              <div className="icon-selector">
                {iconOptions.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    className={`icon-option ${zoneForm.icon === icon ? 'selected' : ''}`}
                    onClick={() => setZoneForm({ ...zoneForm, icon })}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>颜色</label>
              <div className="color-selector">
                {colorOptions.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`color-option ${zoneForm.color === color ? 'selected' : ''}`}
                    style={{ background: color }}
                    onClick={() => setZoneForm({ ...zoneForm, color })}
                  />
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>通知设置</label>
              <div className="notify-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={zoneForm.notifyOnEnter}
                    onChange={(e) => setZoneForm({ ...zoneForm, notifyOnEnter: e.target.checked })}
                  />
                  成员进入时通知
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={zoneForm.notifyOnExit}
                    onChange={(e) => setZoneForm({ ...zoneForm, notifyOnExit: e.target.checked })}
                  />
                  成员离开时通知
                </label>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" onClick={() => setShowZoneModal(false)}>取消</button>
              <button type="submit" onClick={handleCreateZone}>创建</button>
            </div>
          </div>
        </div>
      )}

      {/* 设置模态框 */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>位置设置</h2>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.autoUpdateEnabled}
                  onChange={(e) => setSettings({ ...settings, autoUpdateEnabled: e.target.checked })}
                />
                开启自动更新位置
              </label>
            </div>

            <div className="form-group">
              <label>存储间隔（分钟）</label>
              <select
                value={settings.updateIntervalMinutes}
                onChange={(e) => setSettings({ ...settings, updateIntervalMinutes: parseInt(e.target.value) })}
              >
                <option value="5">5 分钟</option>
                <option value="10">10 分钟</option>
                <option value="15">15 分钟</option>
                <option value="30">30 分钟（默认）</option>
                <option value="60">60 分钟</option>
              </select>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.saveHistory}
                  onChange={(e) => setSettings({ ...settings, saveHistory: e.target.checked })}
                />
                保存位置历史（用于行程轨迹）
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.showDetailedAddress}
                  onChange={(e) => setSettings({ ...settings, showDetailedAddress: e.target.checked })}
                />
                显示详细地址信息
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" onClick={() => setShowSettingsModal(false)}>取消</button>
              <button type="submit" onClick={handleSaveSettings}>保存</button>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialogComponent}
    </div>
  );
};

export default Locations;
