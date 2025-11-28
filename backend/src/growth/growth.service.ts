import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GrowthRecord, GrowthRecordDocument } from './schemas/growth-record.schema';

@Injectable()
export class GrowthService {
  constructor(
    @InjectModel(GrowthRecord.name) private growthRecordModel: Model<GrowthRecordDocument>,
  ) {}

  async create(createDto: any): Promise<GrowthRecordDocument> {
    const record = new this.growthRecordModel(createDto);
    return record.save();
  }

  async findByFamily(familyId: string): Promise<GrowthRecordDocument[]> {
    return this.growthRecordModel
      .find({ familyId })
      .populate('childId', 'username')
      .populate('createdBy', 'username')
      .sort({ date: -1 })
      .exec();
  }

  async findByChild(childId: string): Promise<GrowthRecordDocument[]> {
    return this.growthRecordModel
      .find({ childId })
      .populate('createdBy', 'username')
      .sort({ date: 1 })
      .exec();
  }

  async getGrowthChart(childId: string): Promise<any> {
    const records = await this.findByChild(childId);
    
    return {
      heights: records.filter(r => r.height).map(r => ({ date: r.date, value: r.height })),
      weights: records.filter(r => r.weight).map(r => ({ date: r.date, value: r.weight })),
    };
  }

  async update(id: string, updateDto: any): Promise<GrowthRecordDocument> {
    return this.growthRecordModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
  }

  async delete(id: string): Promise<void> {
    await this.growthRecordModel.findByIdAndDelete(id).exec();
  }
}

