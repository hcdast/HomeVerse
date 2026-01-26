import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ChoresService } from './chores.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chores')
@UseGuards(JwtAuthGuard)
export class ChoresController {
  constructor(private readonly choresService: ChoresService) {}

  // 创建家务
  @Post()
  async create(@Body() createDto: any, @Request() req) {
    return this.choresService.create({
      ...createDto,
      familyId: req.user.familyId,
      createdBy: req.user.userId,
    });
  }

  // 获取所有家务
  @Get()
  async findAll(@Request() req) {
    return this.choresService.findByFamily(req.user.familyId);
  }

  // 获取我的家务
  @Get('my-chores')
  async getMyChores(@Request() req) {
    return this.choresService.findByUser(req.user.familyId, req.user.userId);
  }

  // 获取今日家务
  @Get('today')
  async getTodayChores(@Request() req) {
    return this.choresService.getTodayChores(req.user.familyId);
  }

  // 获取排行榜
  @Get('leaderboard')
  async getLeaderboard(@Request() req) {
    return this.choresService.getLeaderboard(req.user.familyId);
  }

  // 获取统计信息
  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.choresService.getStatistics(req.user.familyId);
  }

  // 获取单个家务
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.choresService.findById(id);
  }

  // 完成家务
  @Put(':id/complete')
  async complete(
    @Param('id') id: string,
    @Body() body: { rating?: number; notes?: string },
    @Request() req,
  ) {
    return this.choresService.complete(id, req.user.userId, body);
  }

  // 跳过家务
  @Put(':id/skip')
  async skip(@Param('id') id: string) {
    return this.choresService.skip(id);
  }

  // 分配家务
  @Put(':id/assign')
  async assign(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.choresService.assign(id, body.userId);
  }

  // 更新家务
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.choresService.update(id, updateDto);
  }

  // 删除家务
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.choresService.delete(id);
    return { message: '已删除' };
  }
}

