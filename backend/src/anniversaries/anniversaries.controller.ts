import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AnniversariesService } from './anniversaries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnniversaryType } from './schemas/anniversary.schema';

@Controller('anniversaries')
@UseGuards(JwtAuthGuard)
export class AnniversariesController {
  constructor(private readonly anniversariesService: AnniversariesService) {}

  // 创建纪念日
  @Post()
  async create(@Body() createDto: any, @Request() req) {
    return this.anniversariesService.create({
      ...createDto,
      familyId: req.user.familyId,
      createdBy: req.user.userId,
    });
  }

  // 获取所有纪念日
  @Get()
  async findAll(@Request() req) {
    return this.anniversariesService.findByFamily(
      req.user.familyId,
      req.user.userId,
    );
  }

  // 获取即将到来的纪念日
  @Get('upcoming')
  async getUpcoming(@Query('days') days: string, @Request() req) {
    return this.anniversariesService.getUpcoming(
      req.user.familyId,
      req.user.userId,
      days ? parseInt(days) : 30,
    );
  }

  // 获取今天的纪念日
  @Get('today')
  async getToday(@Request() req) {
    return this.anniversariesService.getTodayAnniversaries(
      req.user.familyId,
      req.user.userId,
    );
  }

  // 获取需要提醒的纪念日
  @Get('reminders')
  async getReminders(@Request() req) {
    return this.anniversariesService.getReminders(
      req.user.familyId,
      req.user.userId,
    );
  }

  // 按类型获取
  @Get('type/:type')
  async findByType(@Param('type') type: AnniversaryType, @Request() req) {
    return this.anniversariesService.findByType(req.user.familyId, type);
  }

  // 获取统计
  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.anniversariesService.getStatistics(req.user.familyId);
  }

  // 获取单个纪念日
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.anniversariesService.findById(id);
  }

  // 更新纪念日
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.anniversariesService.update(id, updateDto);
  }

  // 删除纪念日
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.anniversariesService.delete(id);
    return { message: '已删除' };
  }

  // 添加礼物想法
  @Post(':id/gift-idea')
  async addGiftIdea(@Param('id') id: string, @Body() body: { idea: string }) {
    return this.anniversariesService.addGiftIdea(id, body.idea);
  }

  // 删除礼物想法
  @Delete(':id/gift-idea/:index')
  async removeGiftIdea(
    @Param('id') id: string,
    @Param('index') index: string,
  ) {
    return this.anniversariesService.removeGiftIdea(id, parseInt(index));
  }

  // 添加庆祝记录
  @Post(':id/celebration')
  async addCelebration(
    @Param('id') id: string,
    @Body() body: { record: string },
  ) {
    return this.anniversariesService.addCelebrationRecord(id, body.record);
  }
}

