import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Res,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FilesService } from './files.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly usersService: UsersService,
  ) {}

  // 获取文件列表
  @Get()
  async findAll(@Request() req, @Query('folder') folder?: string) {
    const user = await this.usersService.findById(req.user.userId);
    return this.filesService.findByFamilyId(user.familyId, folder);
  }

  // 上传文件
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/files',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB限制
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { folder?: string; tags?: string },
    @Request() req,
  ) {
    if (!file) {
      throw new NotFoundException('文件上传失败');
    }
    
    const user = await this.usersService.findById(req.user.userId);
    const tags = body.tags ? body.tags.split(',').map(t => t.trim()).filter(t => t) : [];
    
    const createdFile = await this.filesService.create({
      filename: file.filename,
      originalName: file.originalname,
      path: `/uploads/files/${file.filename}`,
      size: file.size,
      mimeType: file.mimetype,
      familyId: user.familyId,
      uploadedBy: req.user.userId,
      folder: body.folder || '/',
      tags,
      isPublic: false,
      downloads: 0,
    });
    
    return {
      message: '文件上传成功',
      file: createdFile,
    };
  }

  // 下载文件
  @Get('download/:id')
  async downloadFile(@Param('id') id: string, @Request() req, @Res() res: Response) {
    const file = await this.filesService.findById(id);
    if (!file) {
      return res.status(404).json({ message: '文件不存在' });
    }

    // 验证权限：只能下载自己家庭的文件
    const user = await this.usersService.findById(req.user.userId);
    if (file.familyId !== user.familyId) {
      return res.status(403).json({ message: '无权访问此文件' });
    }

    // 增加下载次数
    await this.filesService.incrementDownloads(id);

    // 检查文件是否存在
    const filePath = `.${file.path}`;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: '文件不存在' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Content-Type', file.mimeType);
    return res.sendFile(filePath, { root: '.' });
  }

  // 删除文件
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const file = await this.filesService.findById(id);
    if (!file) {
      throw new NotFoundException('文件不存在');
    }
    
    // 验证权限：只能删除自己家庭的文件
    const user = await this.usersService.findById(req.user.userId);
    if (file.familyId !== user.familyId) {
      throw new NotFoundException('无权访问此文件');
    }
    
    // 删除物理文件
    const filePath = `.${file.path}`;
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error('删除文件失败:', error);
        // 继续删除数据库记录
      }
    }
    
    await this.filesService.delete(id);
    return {
      message: '文件删除成功',
    };
  }

  // 获取存储使用情况
  @Get('storage-usage')
  async getStorageUsage(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    return this.filesService.getStorageUsage(user.familyId);
  }

  // ============= 文件夹管理接口 =============

  // 获取文件夹结构
  @Get('folders/structure')
  async getFolderStructure(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    return this.filesService.getFolderStructure(user.familyId);
  }

  // 获取文件夹内容
  @Get('folders/contents')
  async getFolderContents(@Request() req, @Query('path') path?: string) {
    const user = await this.usersService.findById(req.user.userId);
    return this.filesService.getFolderContents(user.familyId, path);
  }

  // 创建文件夹
  @Post('folders')
  async createFolder(@Body() body: { folderName: string; parentPath?: string }, @Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    return this.filesService.createFolder(user.familyId, body.folderName, body.parentPath);
  }

  // 移动文件
  @Post(':id/move')
  async moveFile(@Param('id') id: string, @Body() body: { targetPath: string }, @Request() req) {
    const file = await this.filesService.findById(id);
    if (!file) {
      throw new NotFoundException('文件不存在');
    }
    
    const user = await this.usersService.findById(req.user.userId);
    if (file.familyId !== user.familyId) {
      throw new NotFoundException('无权访问此文件');
    }
    
    const updatedFile = await this.filesService.moveFile(id, body.targetPath);
    return {
      message: '文件移动成功',
      file: updatedFile,
    };
  }

  // 删除文件夹
  @Delete('folders')
  async deleteFolder(@Query('path') path: string, @Request() req) {
    if (!path || path === '/') {
      throw new NotFoundException('无法删除根目录');
    }
    
    const user = await this.usersService.findById(req.user.userId);
    const result = await this.filesService.deleteFolder(user.familyId, path);
    return {
      message: '文件夹删除成功',
      deletedCount: result.deletedCount,
    };
  }

  // 重命名文件夹
  @Post('folders/rename')
  async renameFolder(@Body() body: { oldPath: string; newName: string }, @Request() req) {
    if (!body.oldPath || body.oldPath === '/') {
      throw new NotFoundException('无法重命名根目录');
    }
    
    const user = await this.usersService.findById(req.user.userId);
    const result = await this.filesService.renameFolder(user.familyId, body.oldPath, body.newName);
    return {
      message: '文件夹重命名成功',
      modifiedCount: result.modifiedCount,
    };
  }
}

