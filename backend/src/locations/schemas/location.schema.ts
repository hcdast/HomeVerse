import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LocationDocument = Location & Document;
export type SafeZoneDocument = SafeZone & Document;
export type LocationHistoryDocument = LocationHistory & Document;
export type DailyRouteDocument = DailyRoute & Document;
export type LocationSettingsDocument = LocationSettings & Document;

@Schema({ timestamps: true })
export class Location {
  @Prop({ type: String, ref: 'User', required: true })
  userId: string;

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop()
  accuracy: number; // 精度（米）

  @Prop()
  altitude: number; // 海拔

  @Prop()
  speed: number; // 速度

  @Prop()
  heading: number; // 方向

  @Prop()
  address: string; // 详细地址

  @Prop()
  province: string; // 省份

  @Prop()
  city: string; // 城市

  @Prop()
  district: string; // 区县

  @Prop()
  street: string; // 街道

  @Prop()
  streetNumber: string; // 门牌号

  @Prop()
  poiName: string; // 兴趣点名称（如商场、学校名称）

  @Prop()
  poiType: string; // 兴趣点类型

  @Prop({ default: true })
  isSharing: boolean; // 是否在分享

  @Prop({ default: false })
  isManual: boolean; // 是否是手动选择的位置

  @Prop()
  battery: number; // 电池电量

  @Prop()
  isCharging: boolean; // 是否在充电

  @Prop()
  deviceInfo: string; // 设备信息

  @Prop()
  networkType: string; // 网络类型 (wifi/4g/5g)

  @Prop()
  lastUpdatedAt: Date;
}

export const LocationSchema = SchemaFactory.createForClass(Location);

// 索引
LocationSchema.index({ userId: 1, familyId: 1 }, { unique: true });
LocationSchema.index({ familyId: 1 });
LocationSchema.index({ location: '2dsphere' });

// 安全区域
@Schema({ timestamps: true })
export class SafeZone {
  @Prop({ required: true })
  name: string; // 区域名称

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop({ required: true, default: 100 })
  radius: number; // 半径（米）

  @Prop()
  address: string;

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: string;

  @Prop({ default: '🏠' })
  icon: string;

  @Prop({ default: '#27ae60' })
  color: string;

  @Prop({ default: true })
  notifyOnEnter: boolean; // 进入时通知

  @Prop({ default: true })
  notifyOnExit: boolean; // 离开时通知

  @Prop({ type: [{ type: String, ref: 'User' }], default: [] })
  watchedMembers: string[]; // 监控的成员

  @Prop({ default: true })
  isActive: boolean;
}

export const SafeZoneSchema = SchemaFactory.createForClass(SafeZone);

SafeZoneSchema.index({ familyId: 1 });

// 位置历史（用于追踪轨迹）
@Schema({ timestamps: true })
export class LocationHistory {
  @Prop({ type: String, ref: 'User', required: true })
  userId: string;

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop()
  accuracy: number;

  @Prop()
  speed: number;

  @Prop()
  heading: number;

  @Prop()
  address: string;

  @Prop()
  poiName: string;

  @Prop({ required: true })
  recordedAt: Date;

  @Prop()
  dateKey: string; // 日期键，格式 YYYY-MM-DD，用于按天分组
}

export const LocationHistorySchema =
  SchemaFactory.createForClass(LocationHistory);

LocationHistorySchema.index({ userId: 1, recordedAt: -1 });
LocationHistorySchema.index({ userId: 1, dateKey: 1 });
LocationHistorySchema.index({ familyId: 1, recordedAt: -1 });
// 自动删除30天前的历史
LocationHistorySchema.index(
  { recordedAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);

// 每日路线记录
@Schema({ timestamps: true })
export class DailyRoute {
  @Prop({ type: String, ref: 'User', required: true })
  userId: string;

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ required: true })
  dateKey: string; // 日期键，格式 YYYY-MM-DD

  @Prop({ required: true })
  date: Date; // 日期

  @Prop({
    type: [
      {
        latitude: Number,
        longitude: Number,
        address: String,
        poiName: String,
        recordedAt: Date,
        speed: Number,
      },
    ],
    default: [],
  })
  points: Array<{
    latitude: number;
    longitude: number;
    address?: string;
    poiName?: string;
    recordedAt: Date;
    speed?: number;
  }>;

  @Prop({ default: 0 })
  totalDistance: number; // 总行程（米）

  @Prop({ default: 0 })
  duration: number; // 总时长（秒）

  @Prop()
  startAddress: string; // 起点地址

  @Prop()
  endAddress: string; // 终点地址

  @Prop()
  color: string; // 路线颜色（每个用户不同）
}

export const DailyRouteSchema = SchemaFactory.createForClass(DailyRoute);

DailyRouteSchema.index({ userId: 1, dateKey: 1 }, { unique: true });
DailyRouteSchema.index({ familyId: 1, dateKey: 1 });
// 自动删除30天前的路线
DailyRouteSchema.index(
  { date: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);

// 用户位置设置
@Schema({ timestamps: true })
export class LocationSettings {
  @Prop({ type: String, ref: 'User', required: true })
  userId: string;

  @Prop({ type: String, ref: 'Family', required: true })
  familyId: string;

  @Prop({ default: true })
  autoUpdateEnabled: boolean; // 是否开启自动更新

  @Prop({ default: 30 })
  updateIntervalMinutes: number; // 更新间隔（分钟），默认30分钟

  @Prop({ default: true })
  saveHistory: boolean; // 是否保存历史

  @Prop({ default: true })
  showDetailedAddress: boolean; // 是否显示详细地址

  @Prop()
  lastAutoUpdateAt: Date; // 上次自动更新时间
}

export const LocationSettingsSchema =
  SchemaFactory.createForClass(LocationSettings);

LocationSettingsSchema.index({ userId: 1, familyId: 1 }, { unique: true });
