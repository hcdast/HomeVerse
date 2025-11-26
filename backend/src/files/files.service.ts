import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { File, FileDocument } from './schemas/file.schema';

@Injectable()
export class FilesService {
  constructor(@InjectModel(File.name) private fileModel: Model<FileDocument>) {}

  // 创建文件记录
  async create(createFileDto: any): Promise<FileDocument> {
    const createdFile = new this.fileModel(createFileDto);
    return createdFile.save();
  }

  // 获取家庭的所有文件
  async findByFamilyId(familyId: string, folder?: string): Promise<FileDocument[]> {
    const query: any = { familyId };
    if (folder) {
      query.folder = folder;
    }
    return this.fileModel.find(query).sort({ createdAt: -1 }).exec();
  }

  // 根据ID查找文件
  async findById(id: string): Promise<FileDocument | null> {
    return this.fileModel.findById(id).exec();
  }

  // 删除文件
  async delete(id: string): Promise<void> {
    const result = await this.fileModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('文件不存在');
    }
  }

  // 增加下载次数
  async incrementDownloads(id: string): Promise<FileDocument> {
    const file = await this.fileModel.findById(id);
    if (!file) {
      throw new NotFoundException('文件不存在');
    }
    file.downloads += 1;
    return file.save();
  }

  // 获取存储使用情况
  async getStorageUsage(familyId: string): Promise<{ used: number; files: number }> {
    const files = await this.fileModel.find({ familyId }).exec();
    const used = files.reduce((sum, file) => sum + file.size, 0);
    return { used, files: files.length };
  }
}

