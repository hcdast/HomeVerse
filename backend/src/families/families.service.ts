import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Family, FamilyDocument } from './schemas/family.schema';

@Injectable()
export class FamiliesService {
  constructor(@InjectModel(Family.name) private familyModel: Model<FamilyDocument>) {}

  // 创建家庭
  async create(createFamilyDto: any): Promise<FamilyDocument> {
    const createdFamily = new this.familyModel(createFamilyDto);
    return createdFamily.save();
  }

  // 根据ID查找家庭
  async findById(id: string): Promise<FamilyDocument | null> {
    return this.familyModel.findById(id).exec();
  }

  // 添加家庭成员
  async addMember(familyId: string, userId: string): Promise<FamilyDocument> {
    const family = await this.familyModel.findById(familyId);
    if (!family) {
      throw new NotFoundException('家庭不存在');
    }
    if (!family.members.includes(userId)) {
      family.members.push(userId);
      return family.save();
    }
    return family;
  }

  // 移除家庭成员
  async removeMember(familyId: string, userId: string): Promise<FamilyDocument> {
    const family = await this.familyModel.findById(familyId);
    if (!family) {
      throw new NotFoundException('家庭不存在');
    }
    family.members = family.members.filter(id => id.toString() !== userId);
    return family.save();
  }

  // 更新家庭信息
  async update(id: string, updateFamilyDto: any): Promise<FamilyDocument> {
    return this.familyModel.findByIdAndUpdate(id, updateFamilyDto, { new: true }).exec();
  }
}

