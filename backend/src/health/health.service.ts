import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HealthRecord, HealthRecordDocument } from './schemas/health-record.schema';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectModel(HealthRecord.name) private healthRecordModel: Model<HealthRecordDocument>,
  ) {}

  async create(createDto: any): Promise<HealthRecordDocument> {
    this.logger.log(`创建健康记录数据: ${JSON.stringify(createDto)}`);
    
    const record = new this.healthRecordModel(createDto);
    const saved = await record.save();
    
    this.logger.log(`保存成功，ID: ${saved._id}`);
    
    return saved;
  }

  async findByFamily(familyId: string): Promise<HealthRecordDocument[]> {
    this.logger.log(`查询familyId为 ${familyId} 的健康记录`);
    
    const records = await this.healthRecordModel
      .find({ familyId })
      .populate('userId', 'username')
      .populate('createdBy', 'username')
      .sort({ date: -1 })
      .exec();
    
    this.logger.log(`查询结果: 找到 ${records.length} 条记录`);
    
    if (records.length > 0) {
      this.logger.log(`第一条记录: ${JSON.stringify(records[0])}`);
    }
    
    return records;
  }

  async findByUser(userId: string): Promise<HealthRecordDocument[]> {
    return this.healthRecordModel
      .find({ userId })
      .populate('createdBy', 'username')
      .sort({ date: -1 })
      .exec();
  }

  async update(id: string, updateDto: any): Promise<HealthRecordDocument> {
    return this.healthRecordModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
  }

  async delete(id: string): Promise<void> {
    await this.healthRecordModel.findByIdAndDelete(id).exec();
  }
}

