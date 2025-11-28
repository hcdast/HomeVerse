import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WikiPage, WikiPageDocument } from './schemas/wiki-page.schema';

@Injectable()
export class WikiService {
  constructor(
    @InjectModel(WikiPage.name) private wikiPageModel: Model<WikiPageDocument>,
  ) {}

  async create(createDto: any, userId: string): Promise<WikiPageDocument> {
    const page = new this.wikiPageModel({
      ...createDto,
      createdBy: userId,
      lastEditedBy: userId,
    });
    return page.save();
  }

  async findByFamily(familyId: string): Promise<WikiPageDocument[]> {
    return this.wikiPageModel
      .find({ familyId })
      .populate('createdBy', 'username')
      .populate('lastEditedBy', 'username')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<WikiPageDocument> {
    const page = await this.wikiPageModel
      .findById(id)
      .populate('createdBy', 'username')
      .exec();
    
    // 增加浏览量
    if (page) {
      page.views += 1;
      await page.save();
    }
    
    return page;
  }

  async update(id: string, updateDto: any, userId: string): Promise<WikiPageDocument> {
    const page = await this.wikiPageModel.findById(id);
    
    // 保存版本历史
    page.versions.push({
      version: page.versions.length + 1,
      content: page.content,
      editedBy: page.lastEditedBy,
      editedAt: new Date(),
    });
    
    return this.wikiPageModel.findByIdAndUpdate(
      id,
      { ...updateDto, lastEditedBy: userId },
      { new: true }
    ).exec();
  }

  async delete(id: string): Promise<void> {
    await this.wikiPageModel.findByIdAndDelete(id).exec();
  }
}

