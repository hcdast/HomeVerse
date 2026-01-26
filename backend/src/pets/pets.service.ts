import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Pet, PetDocument, HealthRecord, FeedingRecord } from './schemas/pet.schema';

@Injectable()
export class PetsService {
  constructor(
    @InjectModel(Pet.name) private petModel: Model<PetDocument>,
  ) {}

  async create(createDto: Partial<Pet>): Promise<PetDocument> {
    const pet = new this.petModel(createDto);
    return pet.save();
  }

  async findByFamily(familyId: string): Promise<PetDocument[]> {
    return this.petModel
      .find({ familyId, isActive: true })
      .populate('createdBy', 'username avatar')
      .populate('caregivers', 'username avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<PetDocument> {
    const pet = await this.petModel
      .findById(id)
      .populate('createdBy', 'username avatar')
      .populate('caregivers', 'username avatar')
      .populate('feedingRecords.fedBy', 'username avatar')
      .exec();
    if (!pet) {
      throw new NotFoundException('宠物不存在');
    }
    return pet;
  }

  async update(id: string, updateDto: Partial<Pet>): Promise<PetDocument> {
    const pet = await this.petModel.findByIdAndUpdate(id, updateDto, { new: true });
    if (!pet) {
      throw new NotFoundException('宠物不存在');
    }
    return pet;
  }

  async delete(id: string): Promise<void> {
    const result = await this.petModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('宠物不存在');
    }
  }

  // 添加健康记录
  async addHealthRecord(petId: string, record: Partial<HealthRecord>): Promise<PetDocument> {
    const pet = await this.petModel.findById(petId);
    if (!pet) {
      throw new NotFoundException('宠物不存在');
    }

    pet.healthRecords.push(record as any);
    
    // 如果是体重记录，更新当前体重
    if (record.type === 'weight' && record.weight) {
      pet.weight = record.weight;
    }

    return pet.save();
  }

  // 删除健康记录
  async deleteHealthRecord(petId: string, recordIndex: number): Promise<PetDocument> {
    const pet = await this.petModel.findById(petId);
    if (!pet) {
      throw new NotFoundException('宠物不存在');
    }

    if (recordIndex >= 0 && recordIndex < pet.healthRecords.length) {
      pet.healthRecords.splice(recordIndex, 1);
    }

    return pet.save();
  }

  // 添加喂养记录
  async addFeedingRecord(petId: string, record: Partial<FeedingRecord>): Promise<PetDocument> {
    const pet = await this.petModel.findById(petId);
    if (!pet) {
      throw new NotFoundException('宠物不存在');
    }

    pet.feedingRecords.push(record as any);
    
    // 只保留最近100条喂养记录
    if (pet.feedingRecords.length > 100) {
      pet.feedingRecords = pet.feedingRecords.slice(-100);
    }

    return pet.save();
  }

  // 获取即将到期的健康提醒
  async getUpcomingHealthReminders(familyId: string, days: number = 30): Promise<any[]> {
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const pets = await this.petModel.find({ familyId, isActive: true }).exec();
    
    const reminders: any[] = [];
    for (const pet of pets) {
      for (const record of pet.healthRecords) {
        if (record.nextDate && record.nextDate >= now && record.nextDate <= endDate) {
          reminders.push({
            petId: pet._id,
            petName: pet.name,
            petType: pet.type,
            petAvatar: pet.avatar,
            ...record,
          });
        }
      }
    }

    return reminders.sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime());
  }

  // 获取统计信息
  async getStatistics(familyId: string): Promise<any> {
    const pets = await this.petModel.find({ familyId, isActive: true }).exec();
    
    const byType: Record<string, number> = {};
    let totalHealthRecords = 0;
    let upcomingVaccinations = 0;
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const pet of pets) {
      byType[pet.type] = (byType[pet.type] || 0) + 1;
      totalHealthRecords += pet.healthRecords.length;
      
      for (const record of pet.healthRecords) {
        if (record.type === 'vaccination' && record.nextDate && 
            record.nextDate >= now && record.nextDate <= thirtyDaysLater) {
          upcomingVaccinations++;
        }
      }
    }

    return {
      total: pets.length,
      byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
      totalHealthRecords,
      upcomingVaccinations,
    };
  }
}




