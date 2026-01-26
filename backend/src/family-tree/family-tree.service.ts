import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FamilyMember, FamilyMemberDocument } from './schemas/family-tree.schema';

@Injectable()
export class FamilyTreeService {
  constructor(@InjectModel(FamilyMember.name) private memberModel: Model<FamilyMemberDocument>) {}

  // 清理空字符串的 ObjectId 引用字段
  private cleanObjectIdFields(dto: Partial<FamilyMember>): Partial<FamilyMember> {
    const cleaned = { ...dto };
    const refFields: (keyof FamilyMember)[] = ['fatherId', 'motherId', 'spouseId', 'linkedUserId'];
    
    for (const field of refFields) {
      if (cleaned[field] === '' || cleaned[field] === null) {
        delete cleaned[field];
      }
    }
    
    return cleaned;
  }

  async create(createDto: Partial<FamilyMember>): Promise<FamilyMemberDocument> {
    const cleanedDto = this.cleanObjectIdFields(createDto);
    return new this.memberModel(cleanedDto).save();
  }

  async findByFamily(familyId: string): Promise<FamilyMemberDocument[]> {
    return this.memberModel.find({ familyId })
      .populate('fatherId', 'name avatar')
      .populate('motherId', 'name avatar')
      .populate('spouseId', 'name avatar')
      .populate('linkedUserId', 'username avatar')
      .sort({ generation: 1, birthday: 1 }).exec();
  }

  async findById(id: string): Promise<FamilyMemberDocument> {
    const member = await this.memberModel.findById(id)
      .populate('fatherId', 'name avatar gender')
      .populate('motherId', 'name avatar gender')
      .populate('spouseId', 'name avatar gender')
      .populate('linkedUserId', 'username avatar').exec();
    if (!member) throw new NotFoundException('成员不存在');
    return member;
  }

  async update(id: string, updateDto: Partial<FamilyMember>): Promise<FamilyMemberDocument> {
    const cleanedDto = this.cleanObjectIdFields(updateDto);
    
    // 对于引用字段，如果传入空值，需要显式设置为 null 来清除
    const updateOperation: any = { ...cleanedDto };
    const refFields = ['fatherId', 'motherId', 'spouseId', 'linkedUserId'];
    const unsetFields: Record<string, 1> = {};
    
    for (const field of refFields) {
      if (updateDto[field as keyof typeof updateDto] === '' || updateDto[field as keyof typeof updateDto] === null) {
        unsetFields[field] = 1;
        delete updateOperation[field];
      }
    }
    
    const update: any = { $set: updateOperation };
    if (Object.keys(unsetFields).length > 0) {
      update.$unset = unsetFields;
    }
    
    const member = await this.memberModel.findByIdAndUpdate(id, update, { new: true });
    if (!member) throw new NotFoundException('成员不存在');
    return member;
  }

  async delete(id: string): Promise<void> {
    const result = await this.memberModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('成员不存在');
  }

  async getChildren(memberId: string): Promise<FamilyMemberDocument[]> {
    return this.memberModel.find({
      $or: [{ fatherId: memberId }, { motherId: memberId }],
    }).sort({ birthday: 1 }).exec();
  }

  async getTreeData(familyId: string): Promise<any> {
    const members = await this.findByFamily(familyId);
    
    // 构建树形结构
    const memberMap = new Map();
    members.forEach(m => memberMap.set(m._id.toString(), { ...m.toObject(), children: [] }));

    const roots: any[] = [];
    members.forEach(m => {
      const member = memberMap.get(m._id.toString());
      if (m.fatherId) {
        const father = memberMap.get(m.fatherId.toString());
        if (father) father.children.push(member);
      } else if (m.motherId) {
        const mother = memberMap.get(m.motherId.toString());
        if (mother) mother.children.push(member);
      } else {
        roots.push(member);
      }
    });

    return { members, roots, totalCount: members.length };
  }

  async getStatistics(familyId: string): Promise<any> {
    const members = await this.memberModel.find({ familyId }).exec();
    const generations = new Set<number>();
    let maleCount = 0, femaleCount = 0, livingCount = 0;

    members.forEach(m => {
      if (m.generation) generations.add(m.generation);
      if (m.gender === 'male') maleCount++;
      if (m.gender === 'female') femaleCount++;
      if (m.isAlive) livingCount++;
    });

    return {
      totalMembers: members.length,
      generationCount: generations.size,
      maleCount,
      femaleCount,
      livingCount,
      deceasedCount: members.length - livingCount,
    };
  }
}

