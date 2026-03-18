import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DataTransferService, ExportOptions } from './data-transfer.service';

@Controller('data-transfer')
@UseGuards(JwtAuthGuard)
export class DataTransferController {
  constructor(private readonly dataTransferService: DataTransferService) {}

  // 导出数据
  @Post('export')
  async exportData(
    @Request() req: any,
    @Body() options: ExportOptions,
    @Res() res: Response,
  ) {
    const familyId = req.user.familyId;
    if (!familyId) {
      throw new BadRequestException('未加入家庭');
    }

    const data = await this.dataTransferService.exportData(familyId, options);

    if (options.format === 'csv') {
      // 返回 CSV 文件
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="homeverse-export-${Date.now()}.json"`);
      return res.json(data);
    }

    // 返回 JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="homeverse-export-${Date.now()}.json"`);
    return res.json(data);
  }

  // 导入数据
  @Post('import')
  async importData(
    @Request() req: any,
    @Body() body: { module: string; data: any[] },
  ) {
    const familyId = req.user.familyId;
    const userId = req.user.userId;
    if (!familyId) {
      throw new BadRequestException('未加入家庭');
    }

    return this.dataTransferService.importData(familyId, userId, body.module, body.data);
  }

  // 从 CSV 文件导入
  @Post('import/csv')
  @UseInterceptors(FileInterceptor('file'))
  async importFromCSV(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('module') module: string,
  ) {
    const familyId = req.user.familyId;
    const userId = req.user.userId;
    if (!familyId) {
      throw new BadRequestException('未加入家庭');
    }

    if (!file) {
      throw new BadRequestException('请上传 CSV 文件');
    }

    const csvContent = file.buffer.toString('utf-8');
    return this.dataTransferService.importFromCSV(familyId, userId, module, csvContent);
  }

  // 备份所有数据
  @Get('backup')
  async backup(@Request() req: any, @Res() res: Response) {
    const familyId = req.user.familyId;
    if (!familyId) {
      throw new BadRequestException('未加入家庭');
    }

    const data = await this.dataTransferService.backupFamily(familyId);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="homeverse-backup-${Date.now()}.json"`);
    return res.json(data);
  }

  // 恢复数据
  @Post('restore')
  async restore(@Request() req: any, @Body() backupData: any) {
    const familyId = req.user.familyId;
    const userId = req.user.userId;
    if (!familyId) {
      throw new BadRequestException('未加入家庭');
    }

    return this.dataTransferService.restoreFamily(familyId, userId, backupData);
  }

  // 获取可导出的模块列表
  @Get('modules')
  getModules() {
    return {
      modules: [
        { id: 'albums', name: '相册', icon: '📷' },
        { id: 'articles', name: '文章', icon: '📝' },
        { id: 'todos', name: '待办', icon: '✅' },
        { id: 'finances', name: '财务', icon: '💰' },
        { id: 'recipes', name: '食谱', icon: '🍳' },
        { id: 'calendars', name: '日历', icon: '📅' },
        { id: 'contacts', name: '联系人', icon: '📞' },
        { id: 'healths', name: '健康', icon: '🏥' },
        { id: 'shoppings', name: '购物', icon: '🛒' },
        { id: 'chores', name: '家务', icon: '🧹' },
        { id: 'budgets', name: '预算', icon: '📊' },
        { id: 'goals', name: '目标', icon: '🎯' },
        { id: 'travels', name: '旅行', icon: '✈️' },
      ],
    };
  }
}



