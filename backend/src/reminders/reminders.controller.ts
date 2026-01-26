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
import { RemindersService } from './reminders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  // 创建提醒
  @Post()
  async create(@Body() createDto: any, @Request() req) {
    return this.remindersService.create({
      ...createDto,
      familyId: req.user.familyId,
      createdBy: req.user.userId,
    });
  }

  // 获取所有提醒
  @Get()
  async findAll(@Request() req) {
    return this.remindersService.findByFamily(req.user.familyId);
  }

  // 获取我的提醒
  @Get('my')
  async findMy(@Request() req) {
    return this.remindersService.findByUser(
      req.user.userId,
      req.user.familyId,
    );
  }

  // 获取今日提醒
  @Get('today')
  async getToday(@Request() req) {
    return this.remindersService.getTodayReminders(req.user.familyId);
  }

  // 获取即将到来的提醒
  @Get('upcoming')
  async getUpcoming(@Query('hours') hours: string, @Request() req) {
    return this.remindersService.getUpcoming(
      req.user.familyId,
      hours ? parseInt(hours) : 24,
    );
  }

  // 按分类获取
  @Get('category/:category')
  async findByCategory(@Param('category') category: string, @Request() req) {
    return this.remindersService.findByCategory(req.user.familyId, category);
  }

  // 获取统计
  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.remindersService.getStatistics(req.user.familyId);
  }

  // 获取单个提醒
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.remindersService.findById(id);
  }

  // 更新提醒
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.remindersService.update(id, updateDto);
  }

  // 延后提醒
  @Post(':id/snooze')
  async snooze(@Param('id') id: string, @Body() body: { minutes?: number }) {
    return this.remindersService.snooze(id, body.minutes);
  }

  // 取消延后
  @Delete(':id/snooze')
  async cancelSnooze(@Param('id') id: string) {
    return this.remindersService.cancelSnooze(id);
  }

  // 标记完成
  @Post(':id/complete')
  async markComplete(@Param('id') id: string) {
    return this.remindersService.markCompleted(id);
  }

  // 切换启用状态
  @Put(':id/toggle')
  async toggleActive(@Param('id') id: string) {
    return this.remindersService.toggleActive(id);
  }

  // 删除提醒
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.remindersService.delete(id);
    return { message: '已删除' };
  }
}


