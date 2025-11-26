import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Album, AlbumDocument } from './schemas/album.schema';

@Injectable()
export class AlbumsService {
  constructor(@InjectModel(Album.name) private albumModel: Model<AlbumDocument>) {}

  // 创建相册
  async create(createAlbumDto: any): Promise<AlbumDocument> {
    const createdAlbum = new this.albumModel(createAlbumDto);
    return createdAlbum.save();
  }

  // 获取家庭的所有相册
  async findByFamilyId(familyId: string): Promise<AlbumDocument[]> {
    return this.albumModel.find({ familyId }).sort({ createdAt: -1 }).exec();
  }

  // 根据ID查找相册
  async findById(id: string): Promise<AlbumDocument | null> {
    return this.albumModel.findById(id).exec();
  }

  // 更新相册
  async update(id: string, updateAlbumDto: any): Promise<AlbumDocument> {
    return this.albumModel.findByIdAndUpdate(id, updateAlbumDto, { new: true }).exec();
  }

  // 删除相册
  async delete(id: string): Promise<void> {
    const result = await this.albumModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('相册不存在');
    }
  }

  // 添加照片到相册
  async addPhoto(albumId: string, photo: any): Promise<AlbumDocument> {
    const album = await this.albumModel.findById(albumId);
    if (!album) {
      throw new NotFoundException('相册不存在');
    }
    album.photos.push(photo);
    if (!album.coverImage && album.photos.length > 0) {
      album.coverImage = album.photos[0].path;
    }
    return album.save();
  }

  // 从相册删除照片
  async removePhoto(albumId: string, photoId: string): Promise<AlbumDocument> {
    const album = await this.albumModel.findById(albumId);
    if (!album) {
      throw new NotFoundException('相册不存在');
    }
    
    // 查找要删除的照片
    const photoToDelete = album.photos.find((photo: any) => {
      const photoIdStr = photo._id ? photo._id.toString() : null;
      return photoIdStr === photoId;
    });
    
    if (!photoToDelete) {
      throw new NotFoundException('照片不存在');
    }
    
    // 删除物理文件
    const fs = require('fs');
    const filePath = `.${photoToDelete.path}`;
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error('删除照片文件失败:', error);
        // 继续删除数据库记录，即使文件删除失败
      }
    }
    
    // 从数组中移除照片
    album.photos = album.photos.filter((photo: any) => {
      const photoIdStr = photo._id ? photo._id.toString() : null;
      return photoIdStr !== photoId;
    });
    
    // 如果删除的是封面图片，更新封面
    if (album.coverImage === photoToDelete.path && album.photos.length > 0) {
      album.coverImage = album.photos[0].path;
    } else if (album.photos.length === 0) {
      album.coverImage = '';
    }
    
    return album.save();
  }
}

