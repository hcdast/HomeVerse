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

  // ============= 文件夹管理功能 =============

  // 获取文件夹结构
  async getFolderStructure(familyId: string): Promise<any> {
    const files = await this.fileModel.find({ familyId }).select('folder').exec();
    const folders = new Set<string>();
    
    files.forEach(file => {
      if (file.folder) {
        // 将所有路径层级都添加到 set 中
        const parts = file.folder.split('/').filter(p => p);
        let currentPath = '';
        parts.forEach(part => {
          currentPath += '/' + part;
          folders.add(currentPath);
        });
      }
    });
    
    return {
      folders: Array.from(folders).sort(),
      rootFolder: '/',
    };
  }

  // 获取指定文件夹下的内容（文件和子文件夹）
  async getFolderContents(familyId: string, folderPath: string = '/'): Promise<any> {
    // 标准化路径
    const normalizedPath = folderPath === '/' ? '/' : '/' + folderPath.split('/').filter(p => p).join('/');
    
    // 获取当前文件夹下的文件
    const files = await this.fileModel
      .find({ 
        familyId,
        folder: normalizedPath,
      })
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'username avatar')
      .exec();
    
    // 获取子文件夹
    const allFiles = await this.fileModel
      .find({ familyId })
      .select('folder')
      .exec();
    
    const subfolders = new Set<string>();
    allFiles.forEach(file => {
      if (file.folder && file.folder.startsWith(normalizedPath) && file.folder !== normalizedPath) {
        const relativePath = file.folder.substring(normalizedPath.length);
        const firstFolder = relativePath.split('/').filter(p => p)[0];
        if (firstFolder) {
          subfolders.add(firstFolder);
        }
      }
    });
    
    return {
      currentPath: normalizedPath,
      files,
      subfolders: Array.from(subfolders).sort(),
    };
  }

  // 移动文件到其他文件夹
  async moveFile(fileId: string, targetPath: string): Promise<FileDocument> {
    const file = await this.fileModel.findById(fileId);
    if (!file) {
      throw new NotFoundException('文件不存在');
    }
    
    // 标准化路径
    const normalizedPath = targetPath === '/' ? '/' : '/' + targetPath.split('/').filter(p => p).join('/');
    file.folder = normalizedPath;
    return file.save();
  }

  // 创建文件夹（逻辑上的，实际通过文件路径实现）
  async createFolder(familyId: string, folderName: string, parentPath: string = '/'): Promise<any> {
    // 标准化路径
    const normalizedParent = parentPath === '/' ? '' : '/' + parentPath.split('/').filter(p => p).join('/');
    const newFolderPath = normalizedParent + '/' + folderName;
    
    // 检查文件夹是否已存在
    const existingFiles = await this.fileModel.findOne({
      familyId,
      folder: newFolderPath,
    });
    
    return {
      message: '文件夹创建成功',
      folderPath: newFolderPath,
      exists: !!existingFiles,
    };
  }

  // 删除文件夹及其所有内容
  async deleteFolder(familyId: string, folderPath: string): Promise<{ deletedCount: number }> {
    // 标准化路径
    const normalizedPath = folderPath === '/' ? '/' : '/' + folderPath.split('/').filter(p => p).join('/');
    
    // 删除该文件夹及所有子文件夹下的文件
    const result = await this.fileModel.deleteMany({
      familyId,
      $or: [
        { folder: normalizedPath },
        { folder: { $regex: `^${normalizedPath}/` } },
      ],
    });
    
    return { deletedCount: result.deletedCount };
  }

  // 重命名文件夹
  async renameFolder(familyId: string, oldPath: string, newName: string): Promise<{ modifiedCount: number }> {
    const normalizedOldPath = oldPath === '/' ? '/' : '/' + oldPath.split('/').filter(p => p).join('/');
    
    // 计算新路径
    const pathParts = normalizedOldPath.split('/').filter(p => p);
    pathParts[pathParts.length - 1] = newName;
    const normalizedNewPath = '/' + pathParts.join('/');
    
    // 更新所有受影响的文件
    const files = await this.fileModel.find({
      familyId,
      $or: [
        { folder: normalizedOldPath },
        { folder: { $regex: `^${normalizedOldPath}/` } },
      ],
    });
    
    let modifiedCount = 0;
    for (const file of files) {
      if (file.folder === normalizedOldPath) {
        file.folder = normalizedNewPath;
      } else {
        file.folder = file.folder.replace(normalizedOldPath + '/', normalizedNewPath + '/');
      }
      await file.save();
      modifiedCount++;
    }
    
    return { modifiedCount };
  }
}

