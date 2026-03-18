import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AlbumsService } from './albums.service';
import { UsersService } from '../users/users.service';
import { StorageService } from '../storage/storage.service';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@Controller('albums')
@UseGuards(JwtAuthGuard)
export class AlbumsController {
  constructor(
    private readonly albumsService: AlbumsService,
    private readonly usersService: UsersService,
    private readonly storageService: StorageService,
  ) {}

  // 获取相册列表
  @Get()
  async findAll(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    return this.albumsService.findByFamilyId(user.familyId);
  }

  // 创建相册
  @Post()
  async create(@Body() createDto: any, @Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    return this.albumsService.create({
      ...createDto,
      familyId: user.familyId,
      createdBy: req.user.userId,
    });
  }

  // 获取相册详情
  @Get(':id')
  async findOne(@Param('id', ParseObjectIdPipe) id: Types.ObjectId, @Request() req) {
    const album = await this.albumsService.findById(id.toString());
    if (!album) {
      throw new NotFoundException('相册不存在');
    }
    
    // 验证权限：只能查看自己家庭的相册
    const user = await this.usersService.findById(req.user.userId);
    if (album.familyId !== user.familyId) {
      throw new NotFoundException('无权访问此相册');
    }
    
    return album;
  }

  // 更新相册
  @Put(':id')
  async update(@Param('id', ParseObjectIdPipe) id: Types.ObjectId, @Body() updateDto: any, @Request() req) {
    const album = await this.albumsService.findById(id.toString());
    if (!album) {
      throw new NotFoundException('相册不存在');
    }
    
    // 验证权限
    const user = await this.usersService.findById(req.user.userId);
    if (album.familyId !== user.familyId) {
      throw new NotFoundException('无权访问此相册');
    }
    
    return this.albumsService.update(id.toString(), updateDto);
  }

  // 删除相册
  @Delete(':id')
  async remove(@Param('id', ParseObjectIdPipe) id: Types.ObjectId, @Request() req) {
    const album = await this.albumsService.findById(id.toString());
    if (!album) {
      throw new NotFoundException('相册不存在');
    }
    
    // 验证权限
    const user = await this.usersService.findById(req.user.userId);
    if (album.familyId !== user.familyId) {
      throw new NotFoundException('无权访问此相册');
    }
    
    // 删除相册中的所有照片文件（从 MinIO）
    if (album.photos && album.photos.length > 0) {
      const objectPaths = album.photos
        .map((photo: any) => this.storageService.extractObjectPath(photo.path))
        .filter(path => path !== null);
      
      if (objectPaths.length > 0) {
        try {
          await this.storageService.deleteFiles(objectPaths);
        } catch (error) {
          console.error('从 MinIO 删除照片失败:', error);
        }
      }
    }
    
    return this.albumsService.delete(id.toString());
  }

  // 上传照片到相册（单张）
  @Post(':id/photos')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB限制
      fileFilter: (req, file, cb) => {
        // 只允许图片文件
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new Error('只支持图片格式：jpg, jpeg, png, gif, webp'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadPhoto(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new NotFoundException('文件上传失败');
    }
    
    // 验证权限
    const album = await this.albumsService.findById(id.toString());
    if (!album) {
      throw new NotFoundException('相册不存在');
    }
    
    const user = await this.usersService.findById(req.user.userId);
    if (album.familyId !== user.familyId) {
      throw new NotFoundException('无权访问此相册');
    }
    
    // 上传到 MinIO
    const uploadResult = await this.storageService.uploadFile(file, 'photos');
    
    const photo = {
      filename: uploadResult.filename,
      originalName: uploadResult.originalName,
      path: uploadResult.url,  // 存储 MinIO 的公网 URL
      size: uploadResult.size,
      metadata: {
        mimeType: uploadResult.mimeType,
      },
      uploadedAt: new Date(),
    };
    
    const updatedAlbum = await this.albumsService.addPhoto(id.toString(), photo);
    return {
      message: '照片上传成功',
      photo: updatedAlbum.photos[updatedAlbum.photos.length - 1],
      album: updatedAlbum,
      url: uploadResult.url,
    };
  }

  // 批量上传照片到相册
  @Post(':id/photos/batch')
  @UseInterceptors(
    FilesInterceptor('files', 100, {
      limits: { fileSize: 10 * 1024 * 1024 }, // 每个文件10MB限制
      fileFilter: (req, file, cb) => {
        // 只允许图片文件
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new Error('只支持图片格式：jpg, jpeg, png, gif, webp'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadPhotosBatch(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    if (!files || files.length === 0) {
      throw new NotFoundException('没有上传任何文件');
    }
    
    // 验证权限
    const album = await this.albumsService.findById(id.toString());
    if (!album) {
      throw new NotFoundException('相册不存在');
    }
    
    const user = await this.usersService.findById(req.user.userId);
    if (album.familyId !== user.familyId) {
      throw new NotFoundException('无权访问此相册');
    }
    
    // 批量上传到 MinIO
    const photos = [];
    const uploadResults = [];
    
    for (const file of files) {
      try {
        const uploadResult = await this.storageService.uploadFile(file, 'photos');
        uploadResults.push(uploadResult);
        
        photos.push({
          filename: uploadResult.filename,
          originalName: uploadResult.originalName,
          path: uploadResult.url,
          size: uploadResult.size,
          metadata: {
            mimeType: uploadResult.mimeType,
          },
          uploadedAt: new Date(),
        });
      } catch (error) {
        console.error(`上传照片 ${file.originalname} 失败:`, error);
        // 继续上传其他文件
      }
    }
    
    if (photos.length === 0) {
      throw new NotFoundException('所有照片上传失败');
    }
    
    // 批量添加照片到相册
    const updatedAlbum = await this.albumsService.addPhotos(id.toString(), photos);
    
    return {
      message: `成功上传 ${photos.length} 张照片`,
      total: files.length,
      success: photos.length,
      failed: files.length - photos.length,
      album: updatedAlbum,
    };
  }

  // 删除照片
  @Delete(':id/photos/:photoId')
  async removePhoto(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Param('photoId', ParseObjectIdPipe) photoId: Types.ObjectId,
    @Request() req,
  ) {
    // 验证权限
    const album = await this.albumsService.findById(id.toString());
    if (!album) {
      throw new NotFoundException('相册不存在');
    }
    
    const user = await this.usersService.findById(req.user.userId);
    if (album.familyId !== user.familyId) {
      throw new NotFoundException('无权访问此相册');
    }
    
    const { album: updatedAlbum, deletedPhoto } = await this.albumsService.removePhoto(id.toString(), photoId.toString());
    
    // 从 MinIO 删除照片文件
    if (deletedPhoto && deletedPhoto.path) {
      try {
        const objectPath = this.storageService.extractObjectPath(deletedPhoto.path);
        if (objectPath) {
          await this.storageService.deleteFile(objectPath);
        }
      } catch (error) {
        console.error('从 MinIO 删除照片失败:', error);
        // 继续返回成功，数据库记录已删除
      }
    }
    
    return {
      message: '照片删除成功',
      album: updatedAlbum,
    };
  }
}

