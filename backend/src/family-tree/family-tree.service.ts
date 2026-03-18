import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FamilyMember, FamilyMemberDocument } from './schemas/family-tree.schema';

@Injectable()
export class FamilyTreeService implements OnModuleInit {
  private readonly logger = new Logger(FamilyTreeService.name);

  constructor(@InjectModel(FamilyMember.name) private memberModel: Model<FamilyMemberDocument>) {}

  // 模块初始化时清理脏数据
  async onModuleInit() {
    await this.cleanupInvalidReferences();
  }

  // 清理数据库中的空字符串引用（脏数据修复）
  private async cleanupInvalidReferences(): Promise<void> {
    const refFields = ['fatherId', 'motherId', 'spouseId', 'linkedUserId'];
    
    for (const field of refFields) {
      try {
        // 使用原生 collection 操作，绕过 Mongoose schema 类型检查
        const collection = this.memberModel.collection;
        const result = await collection.updateMany(
          { [field]: '' },
          { $unset: { [field]: 1 } }
        );
        if (result.modifiedCount > 0) {
          this.logger.log(`清理了 ${result.modifiedCount} 条记录的无效 ${field} 引用`);
        }
      } catch (error) {
        // 忽略错误，可能是没有脏数据
        this.logger.debug(`清理 ${field} 时无脏数据或已清理`);
      }
    }
  }

  // 清理空字符串的 ObjectId 引用字段，将其转换为 null
  private cleanObjectIdFields(dto: any): any {
    const cleaned = { ...dto };
    const refFields = ['fatherId', 'motherId', 'spouseId', 'linkedUserId'];
    
    for (const field of refFields) {
      if (cleaned[field] === '' || cleaned[field] === undefined) {
        cleaned[field] = null;
      } else if (cleaned[field] && typeof cleaned[field] === 'string') {
        // 验证是否为有效的 ObjectId
        if (Types.ObjectId.isValid(cleaned[field])) {
          cleaned[field] = new Types.ObjectId(cleaned[field]);
        } else {
          cleaned[field] = null;
        }
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
    
    const member = await this.memberModel.findByIdAndUpdate(id, cleanedDto, { new: true });
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

