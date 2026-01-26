import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contact, ContactDocument, ContactCategory } from './schemas/contact.schema';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
  ) {}

  // 创建联系人
  async create(createDto: Partial<Contact>): Promise<ContactDocument> {
    const contact = new this.contactModel(createDto);
    return contact.save();
  }

  // 获取家庭所有联系人
  async findByFamily(familyId: string): Promise<ContactDocument[]> {
    return this.contactModel
      .find({ familyId })
      .populate('createdBy', 'username avatar')
      .sort({ isEmergency: -1, isFavorite: -1, priority: -1, name: 1 })
      .exec();
  }

  // 获取紧急联系人
  async getEmergencyContacts(familyId: string): Promise<ContactDocument[]> {
    return this.contactModel
      .find({ familyId, isEmergency: true })
      .sort({ priority: -1 })
      .exec();
  }

  // 获取收藏联系人
  async getFavoriteContacts(familyId: string): Promise<ContactDocument[]> {
    return this.contactModel
      .find({ familyId, isFavorite: true })
      .sort({ priority: -1, name: 1 })
      .exec();
  }

  // 按分类获取联系人
  async findByCategory(
    familyId: string,
    category: ContactCategory,
  ): Promise<ContactDocument[]> {
    return this.contactModel
      .find({ familyId, category })
      .sort({ priority: -1, name: 1 })
      .exec();
  }

  // 搜索联系人
  async search(familyId: string, keyword: string): Promise<ContactDocument[]> {
    return this.contactModel
      .find({
        familyId,
        $or: [
          { name: { $regex: keyword, $options: 'i' } },
          { relationship: { $regex: keyword, $options: 'i' } },
          { organization: { $regex: keyword, $options: 'i' } },
          { phone: { $regex: keyword, $options: 'i' } },
          { tags: { $in: [new RegExp(keyword, 'i')] } },
        ],
      })
      .sort({ isEmergency: -1, priority: -1 })
      .exec();
  }

  // 获取单个联系人
  async findById(id: string): Promise<ContactDocument> {
    const contact = await this.contactModel.findById(id);
    if (!contact) {
      throw new NotFoundException('联系人不存在');
    }
    return contact;
  }

  // 更新联系人
  async update(id: string, updateDto: Partial<Contact>): Promise<ContactDocument> {
    const contact = await this.contactModel.findByIdAndUpdate(id, updateDto, {
      new: true,
    });
    if (!contact) {
      throw new NotFoundException('联系人不存在');
    }
    return contact;
  }

  // 删除联系人
  async delete(id: string): Promise<void> {
    const result = await this.contactModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('联系人不存在');
    }
  }

  // 切换紧急联系人状态
  async toggleEmergency(id: string): Promise<ContactDocument> {
    const contact = await this.contactModel.findById(id);
    if (!contact) {
      throw new NotFoundException('联系人不存在');
    }
    contact.isEmergency = !contact.isEmergency;
    return contact.save();
  }

  // 切换收藏状态
  async toggleFavorite(id: string): Promise<ContactDocument> {
    const contact = await this.contactModel.findById(id);
    if (!contact) {
      throw new NotFoundException('联系人不存在');
    }
    contact.isFavorite = !contact.isFavorite;
    return contact.save();
  }

  // 获取统计信息
  async getStatistics(familyId: string): Promise<{
    total: number;
    emergency: number;
    favorites: number;
    byCategory: { category: string; count: number }[];
  }> {
    const [total, emergency, favorites, byCategory] = await Promise.all([
      this.contactModel.countDocuments({ familyId }),
      this.contactModel.countDocuments({ familyId, isEmergency: true }),
      this.contactModel.countDocuments({ familyId, isFavorite: true }),
      this.contactModel.aggregate([
        { $match: { familyId } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      emergency,
      favorites,
      byCategory: byCategory.map((item) => ({
        category: item._id,
        count: item.count,
      })),
    };
  }

  // 批量导入联系人
  async bulkImport(
    familyId: string,
    createdBy: string,
    contacts: Partial<Contact>[],
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const contactData of contacts) {
      try {
        await this.create({
          ...contactData,
          familyId,
          createdBy,
        });
        success++;
      } catch (error) {
        this.logger.error(`导入联系人失败: ${error.message}`);
        failed++;
      }
    }

    return { success, failed };
  }
}

