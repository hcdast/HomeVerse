import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Location,
  LocationDocument,
  SafeZone,
  SafeZoneDocument,
  LocationHistory,
  LocationHistoryDocument,
  DailyRoute,
  DailyRouteDocument,
  LocationSettings,
  LocationSettingsDocument,
} from './schemas/location.schema';

// 用户路线颜色
const USER_COLORS = [
  '#3498db', // 蓝色
  '#e74c3c', // 红色
  '#27ae60', // 绿色
  '#9b59b6', // 紫色
  '#f39c12', // 橙色
  '#1abc9c', // 青色
  '#e91e63', // 粉色
  '#00bcd4', // 天蓝
  '#ff5722', // 深橙
  '#795548', // 棕色
];

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
    @InjectModel(SafeZone.name) private safeZoneModel: Model<SafeZoneDocument>,
    @InjectModel(LocationHistory.name)
    private historyModel: Model<LocationHistoryDocument>,
    @InjectModel(DailyRoute.name)
    private dailyRouteModel: Model<DailyRouteDocument>,
    @InjectModel(LocationSettings.name)
    private settingsModel: Model<LocationSettingsDocument>,
  ) {}

  // 获取日期键
  private getDateKey(date: Date = new Date()): string {
    return date.toISOString().split('T')[0];
  }

  // 获取用户颜色
  private getUserColor(userId: string, familyMembers: string[]): string {
    const index = familyMembers.indexOf(userId);
    return USER_COLORS[index >= 0 ? index % USER_COLORS.length : 0];
  }

  // 更新用户位置
  async updateLocation(
    userId: string,
    familyId: string,
    locationData: Partial<Location> & { forceSave?: boolean },
  ): Promise<LocationDocument> {
    const now = new Date();
    const dateKey = this.getDateKey(now);

    // 获取用户设置
    const settings = await this.getOrCreateSettings(userId, familyId);

    // 更新当前位置
    const location = await this.locationModel.findOneAndUpdate(
      { userId, familyId },
      {
        ...locationData,
        userId,
        familyId,
        lastUpdatedAt: now,
      },
      { upsert: true, new: true },
    );

    // 检查是否需要保存历史（根据设置的间隔，或者强制保存）
    const shouldSave =
      locationData.forceSave === true ||
      (settings.saveHistory &&
        (await this.shouldSaveHistory(
          userId,
          familyId,
          settings.updateIntervalMinutes,
        )));

    this.logger.log(
      `用户 ${userId} 位置更新 - forceSave: ${locationData.forceSave}, saveHistory: ${settings.saveHistory}, shouldSave: ${shouldSave}`,
    );

    if (shouldSave && locationData.latitude && locationData.longitude) {
      // 保存历史记录
      await this.historyModel.create({
        userId,
        familyId,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        speed: locationData.speed,
        heading: locationData.heading,
        address: locationData.address,
        poiName: locationData.poiName,
        recordedAt: now,
        dateKey,
      });

      this.logger.log(`已保存位置历史: ${dateKey}, 用户: ${userId}`);

      // 更新每日路线
      await this.updateDailyRoute(userId, familyId, dateKey, {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        address: locationData.address,
        poiName: locationData.poiName,
        recordedAt: now,
        speed: locationData.speed,
      });

      // 更新设置的最后更新时间
      await this.settingsModel.updateOne(
        { userId, familyId },
        { lastAutoUpdateAt: now },
      );
    }

    // 检查安全区域
    if (locationData.latitude && locationData.longitude) {
      await this.checkSafeZones(
        userId,
        familyId,
        locationData.latitude,
        locationData.longitude,
      );
    }

    return location;
  }

  // 检查是否应该保存历史
  private async shouldSaveHistory(
    userId: string,
    familyId: string,
    intervalMinutes: number,
  ): Promise<boolean> {
    const settings = await this.settingsModel.findOne({ userId, familyId });

    if (!settings?.lastAutoUpdateAt) {
      return true; // 首次记录
    }

    const diffMs = Date.now() - settings.lastAutoUpdateAt.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    return diffMinutes >= intervalMinutes;
  }

  // 更新每日路线（使用 upsert 避免并发创建重复记录）
  private async updateDailyRoute(
    userId: string,
    familyId: string,
    dateKey: string,
    point: {
      latitude: number;
      longitude: number;
      address?: string;
      poiName?: string;
      recordedAt: Date;
      speed?: number;
    },
  ): Promise<void> {
    // 获取家庭成员列表用于分配颜色
    const familyLocations = await this.locationModel.find({ familyId });
    const memberIds = familyLocations.map((l) => l.userId.toString());
    const color = this.getUserColor(userId, memberIds);

    // 使用 findOneAndUpdate + upsert 避免并发时的重复键错误
    const existingRoute = await this.dailyRouteModel.findOne({ userId, dateKey });

    if (!existingRoute) {
      // 使用 upsert 创建或更新，避免并发重复键错误
      await this.dailyRouteModel.findOneAndUpdate(
        { userId, dateKey },
        {
          $setOnInsert: {
            userId,
            familyId,
            dateKey,
            date: new Date(dateKey),
            startAddress: point.address || point.poiName,
            color,
            totalDistance: 0,
            duration: 0,
          },
          $push: { points: point },
        },
        { upsert: true, new: true },
      );
    } else {
      // 计算与上一个点的距离
      let addedDistance = 0;
      if (existingRoute.points.length > 0) {
        const lastPoint = existingRoute.points[existingRoute.points.length - 1];
        addedDistance = this.calculateDistance(
          lastPoint.latitude,
          lastPoint.longitude,
          point.latitude,
          point.longitude,
        );
      }

      // 计算新的时长
      let newDuration = existingRoute.duration || 0;
      if (existingRoute.points.length >= 1) {
        const firstPoint = existingRoute.points[0];
        newDuration =
          (point.recordedAt.getTime() - firstPoint.recordedAt.getTime()) / 1000;
      }

      // 原子更新：添加新点并更新统计
      await this.dailyRouteModel.findOneAndUpdate(
        { userId, dateKey },
        {
          $push: { points: point },
          $inc: { totalDistance: addedDistance },
          $set: {
            endAddress: point.address || point.poiName,
            duration: newDuration,
          },
        },
      );
    }
  }

  // 获取家庭成员位置（含今日历史记录数）
  async getFamilyLocations(familyId: string): Promise<any[]> {
    const locations = await this.locationModel
      .find({ familyId, isSharing: true })
      .populate('userId', 'username avatar')
      .lean()
      .exec();

    const today = this.getDateKey();

    // 为每个成员附加今日记录数
    const locationsWithHistory = await Promise.all(
      locations.map(async (loc) => {
        // 获取用户ID（可能是对象或字符串）
        const userIdValue =
          typeof loc.userId === 'object' && loc.userId !== null
            ? (loc.userId as any)._id?.toString() || (loc.userId as any).toString()
            : String(loc.userId || '');

        const historyCount = await this.historyModel.countDocuments({
          userId: userIdValue,
          familyId,
          dateKey: today,
        });
        
        // 获取今日路线信息
        const todayRoute = await this.dailyRouteModel.findOne({
          userId: userIdValue,
          familyId,
          dateKey: today,
        });

        return {
          ...loc,
          todayHistoryCount: historyCount,
          todayDistance: todayRoute?.totalDistance || 0,
          todayDuration: todayRoute?.duration || 0,
        };
      }),
    );

    return locationsWithHistory;
  }

  // 获取用户当前位置
  async getUserLocation(
    userId: string,
    familyId: string,
  ): Promise<LocationDocument> {
    const location = await this.locationModel
      .findOne({ userId, familyId })
      .populate('userId', 'username avatar')
      .exec();
    if (!location) {
      throw new NotFoundException('位置信息不存在');
    }
    return location;
  }

  // 切换位置分享
  async toggleSharing(
    userId: string,
    familyId: string,
  ): Promise<LocationDocument> {
    const location = await this.locationModel.findOne({ userId, familyId });
    if (!location) {
      // 创建新记录，默认关闭分享
      return this.locationModel.create({
        userId,
        familyId,
        latitude: 0,
        longitude: 0,
        isSharing: false,
      });
    }

    location.isSharing = !location.isSharing;
    return location.save();
  }

  // 获取用户位置历史
  async getLocationHistory(
    userId: string,
    familyId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<LocationHistoryDocument[]> {
    const query: any = { userId, familyId };

    if (options?.startDate || options?.endDate) {
      query.recordedAt = {};
      if (options.startDate) query.recordedAt.$gte = options.startDate;
      if (options.endDate) query.recordedAt.$lte = options.endDate;
    }

    let queryBuilder = this.historyModel.find(query).sort({ recordedAt: -1 });

    if (options?.limit) {
      queryBuilder = queryBuilder.limit(options.limit);
    }

    return queryBuilder.exec();
  }

  // 获取每日路线
  async getDailyRoute(
    userId: string,
    familyId: string,
    dateKey: string,
  ): Promise<DailyRouteDocument | null> {
    return this.dailyRouteModel.findOne({ userId, familyId, dateKey }).exec();
  }

  // 获取家庭所有成员的每日路线
  async getFamilyDailyRoutes(
    familyId: string,
    dateKey: string,
  ): Promise<DailyRouteDocument[]> {
    return this.dailyRouteModel
      .find({ familyId, dateKey })
      .populate('userId', 'username avatar')
      .exec();
  }

  // 获取用户多天的路线
  async getUserRoutes(
    userId: string,
    familyId: string,
    startDate: string,
    endDate: string,
  ): Promise<DailyRouteDocument[]> {
    return this.dailyRouteModel
      .find({
        userId,
        familyId,
        dateKey: { $gte: startDate, $lte: endDate },
      })
      .sort({ dateKey: -1 })
      .exec();
  }

  // ========== 位置设置 ==========

  // 获取或创建用户设置
  async getOrCreateSettings(
    userId: string,
    familyId: string,
  ): Promise<LocationSettingsDocument> {
    let settings = await this.settingsModel.findOne({ userId, familyId });

    if (!settings) {
      settings = await this.settingsModel.create({
        userId,
        familyId,
        autoUpdateEnabled: true,
        updateIntervalMinutes: 30,
        saveHistory: true,
        showDetailedAddress: true,
      });
    }

    return settings;
  }

  // 更新用户设置
  async updateSettings(
    userId: string,
    familyId: string,
    updateDto: Partial<LocationSettings>,
  ): Promise<LocationSettingsDocument> {
    const settings = await this.settingsModel.findOneAndUpdate(
      { userId, familyId },
      updateDto,
      { new: true, upsert: true },
    );
    return settings;
  }

  // 获取用户设置
  async getSettings(
    userId: string,
    familyId: string,
  ): Promise<LocationSettingsDocument | null> {
    return this.settingsModel.findOne({ userId, familyId });
  }

  // ========== 安全区域管理 ==========

  // 创建安全区域
  async createSafeZone(createDto: Partial<SafeZone>): Promise<SafeZoneDocument> {
    const safeZone = new this.safeZoneModel(createDto);
    return safeZone.save();
  }

  // 获取家庭安全区域
  async getSafeZones(familyId: string): Promise<SafeZoneDocument[]> {
    return this.safeZoneModel
      .find({ familyId, isActive: true })
      .populate('createdBy', 'username avatar')
      .populate('watchedMembers', 'username avatar')
      .exec();
  }

  // 更新安全区域
  async updateSafeZone(
    id: string,
    updateDto: Partial<SafeZone>,
  ): Promise<SafeZoneDocument> {
    const safeZone = await this.safeZoneModel.findByIdAndUpdate(id, updateDto, {
      new: true,
    });
    if (!safeZone) {
      throw new NotFoundException('安全区域不存在');
    }
    return safeZone;
  }

  // 删除安全区域
  async deleteSafeZone(id: string): Promise<void> {
    const result = await this.safeZoneModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('安全区域不存在');
    }
  }

  // 检查安全区域
  private async checkSafeZones(
    userId: string,
    familyId: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    const safeZones = await this.safeZoneModel.find({
      familyId,
      isActive: true,
      watchedMembers: userId,
    });

    for (const zone of safeZones) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        zone.latitude,
        zone.longitude,
      );

      const isInside = distance <= zone.radius;

      // 这里可以添加通知逻辑
      this.logger.debug(
        `User ${userId} is ${isInside ? 'inside' : 'outside'} safe zone ${zone.name}`,
      );
    }
  }

  // 计算两点距离（米）
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // 地球半径（米）
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // 添加监控成员
  async addWatchedMember(
    zoneId: string,
    memberId: string,
  ): Promise<SafeZoneDocument> {
    const zone = await this.safeZoneModel.findById(zoneId);
    if (!zone) {
      throw new NotFoundException('安全区域不存在');
    }

    if (!zone.watchedMembers.includes(memberId as any)) {
      zone.watchedMembers.push(memberId as any);
    }

    return zone.save();
  }

  // 移除监控成员
  async removeWatchedMember(
    zoneId: string,
    memberId: string,
  ): Promise<SafeZoneDocument> {
    const zone = await this.safeZoneModel.findById(zoneId);
    if (!zone) {
      throw new NotFoundException('安全区域不存在');
    }

    const index = zone.watchedMembers.indexOf(memberId as any);
    if (index > -1) {
      zone.watchedMembers.splice(index, 1);
    }

    return zone.save();
  }

  // 获取统计
  async getStatistics(familyId: string): Promise<{
    sharingMembers: number;
    totalMembers: number;
    safeZonesCount: number;
    todayRouteDistance: number;
  }> {
    const dateKey = this.getDateKey();
    const [sharing, total, zones, routes] = await Promise.all([
      this.locationModel.countDocuments({ familyId, isSharing: true }),
      this.locationModel.countDocuments({ familyId }),
      this.safeZoneModel.countDocuments({ familyId, isActive: true }),
      this.dailyRouteModel.find({ familyId, dateKey }),
    ]);

    const todayRouteDistance = routes.reduce(
      (sum, r) => sum + (r.totalDistance || 0),
      0,
    );

    return {
      sharingMembers: sharing,
      totalMembers: total,
      safeZonesCount: zones,
      todayRouteDistance,
    };
  }
}
