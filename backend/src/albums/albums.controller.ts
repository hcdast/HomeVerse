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
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AlbumsService } from './albums.service';
import { UsersService } from '../users/users.service';
import { StorageService } from '../storage/storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
  async findOne(@Param('id') id: string, @Request() req) {
    const album = await this.albumsService.findById(id);
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
  async update(@Param('id') id: string, @Body() updateDto: any, @Request() req) {
    const album = await this.albumsService.findById(id);
    if (!album) {
      throw new NotFoundException('相册不存在');
    }
    
    // 验证权限
    const user = await this.usersService.findById(req.user.userId);
    if (album.familyId !== user.familyId) {
      throw new NotFoundException('无权访问此相册');
    }
    
    return this.albumsService.update(id, updateDto);
  }

  // 删除相册
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const album = await this.albumsService.findById(id);
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
    
    return this.albumsService.delete(id);
  }

  // 上传照片到相册
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
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new NotFoundException('文件上传失败');
    }
    
    // 验证权限
    const album = await this.albumsService.findById(id);
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
    
    const updatedAlbum = await this.albumsService.addPhoto(id, photo);
    return {
      message: '照片上传成功',
      photo: updatedAlbum.photos[updatedAlbum.photos.length - 1],
      album: updatedAlbum,
      url: uploadResult.url,
    };
  }

  // 删除照片
  @Delete(':id/photos/:photoId')
  async removePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Request() req,
  ) {
    // 验证权限
    const album = await this.albumsService.findById(id);
    if (!album) {
      throw new NotFoundException('相册不存在');
    }
    
    const user = await this.usersService.findById(req.user.userId);
    if (album.familyId !== user.familyId) {
      throw new NotFoundException('无权访问此相册');
    }
    
    const { album: updatedAlbum, deletedPhoto } = await this.albumsService.removePhoto(id, photoId);
    
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

