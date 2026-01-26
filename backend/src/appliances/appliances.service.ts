import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Appliance, ApplianceDocument, MaintenanceRecord } from './schemas/appliance.schema';

@Injectable()
export class AppliancesService {
  constructor(
    @InjectModel(Appliance.name) private applianceModel: Model<ApplianceDocument>,
  ) {}

  async create(createDto: Partial<Appliance>): Promise<ApplianceDocument> {
    const appliance = new this.applianceModel(createDto);
    return appliance.save();
  }

  async findByFamily(familyId: string, category?: string): Promise<ApplianceDocument[]> {
    const query: any = { familyId };
    if (category) {
      query.category = category;
    }
    return this.applianceModel
      .find(query)
      .populate('createdBy', 'username avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<ApplianceDocument> {
    const appliance = await this.applianceModel
      .findById(id)
      .populate('createdBy', 'username avatar')
      .exec();
    if (!appliance) {
      throw new NotFoundException('家电不存在');
    }
    return appliance;
  }

  async update(id: string, updateDto: Partial<Appliance>): Promise<ApplianceDocument> {
    const appliance = await this.applianceModel.findByIdAndUpdate(id, updateDto, { new: true });
    if (!appliance) {
      throw new NotFoundException('家电不存在');
    }
    return appliance;
  }

  async delete(id: string): Promise<void> {
    const result = await this.applianceModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('家电不存在');
    }
  }

  // 添加维护记录
  async addMaintenanceRecord(applianceId: string, record: Partial<MaintenanceRecord>): Promise<ApplianceDocument> {
    const appliance = await this.applianceModel.findById(applianceId);
    if (!appliance) {
      throw new NotFoundException('家电不存在');
    }

    appliance.maintenanceRecords.push(record as any);
    appliance.lastMaintenanceDate = new Date(record.date);

    // 计算下次维护日期
    if (appliance.maintenanceCycle) {
      const nextDate = new Date(record.date);
      nextDate.setDate(nextDate.getDate() + appliance.maintenanceCycle);
      appliance.nextMaintenanceDate = nextDate;
    } else if (record.nextDate) {
      appliance.nextMaintenanceDate = new Date(record.nextDate);
    }

    return appliance.save();
  }

  // 删除维护记录
  async deleteMaintenanceRecord(applianceId: string, recordIndex: number): Promise<ApplianceDocument> {
    const appliance = await this.applianceModel.findById(applianceId);
    if (!appliance) {
      throw new NotFoundException('家电不存在');
    }

    if (recordIndex >= 0 && recordIndex < appliance.maintenanceRecords.length) {
      appliance.maintenanceRecords.splice(recordIndex, 1);
    }

    return appliance.save();
  }

  // 获取即将过保的家电
  async getExpiringWarranties(familyId: string, days: number = 30): Promise<ApplianceDocument[]> {
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.applianceModel
      .find({
        familyId,
        status: 'active',
        warrantyEndDate: { $gte: now, $lte: endDate },
      })
      .sort({ warrantyEndDate: 1 })
      .exec();
  }

  // 获取需要维护的家电
  async getMaintenanceDue(familyId: string, days: number = 30): Promise<ApplianceDocument[]> {
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.applianceModel
      .find({
        familyId,
        status: 'active',
        nextMaintenanceDate: { $gte: now, $lte: endDate },
      })
      .sort({ nextMaintenanceDate: 1 })
      .exec();
  }

  // 获取统计信息
  async getStatistics(familyId: string): Promise<any> {
    const appliances = await this.applianceModel.find({ familyId }).exec();
    
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const byCategory: Record<string, number> = {};
    let totalValue = 0;
    let activeCount = 0;
    let warrantyExpiringCount = 0;
    let maintenanceDueCount = 0;

    for (const appliance of appliances) {
      byCategory[appliance.category] = (byCategory[appliance.category] || 0) + 1;
      
      if (appliance.price) {
        totalValue += appliance.price;
      }
      
      if (appliance.status === 'active') {
        activeCount++;
      }

      if (appliance.warrantyEndDate && appliance.warrantyEndDate >= now && appliance.warrantyEndDate <= thirtyDaysLater) {
        warrantyExpiringCount++;
      }

      if (appliance.nextMaintenanceDate && appliance.nextMaintenanceDate >= now && appliance.nextMaintenanceDate <= thirtyDaysLater) {
        maintenanceDueCount++;
      }
    }

    return {
      total: appliances.length,
      activeCount,
      totalValue,
      warrantyExpiringCount,
      maintenanceDueCount,
      byCategory: Object.entries(byCategory).map(([category, count]) => ({ category, count })),
    };
  }
}




