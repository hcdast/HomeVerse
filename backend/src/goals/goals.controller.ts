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
import { GoalsService } from './goals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GoalStatus } from './schemas/goal.schema';

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  // 创建目标
  @Post()
  async create(@Body() createDto: any, @Request() req) {
    return this.goalsService.create({
      ...createDto,
      familyId: req.user.familyId,
      createdBy: req.user.userId,
      participants: [req.user.userId, ...(createDto.participants || [])],
    });
  }

  // 获取所有目标
  @Get()
  async findAll(
    @Query('status') status: GoalStatus,
    @Query('category') category: string,
    @Request() req,
  ) {
    return this.goalsService.findByFamily(
      req.user.familyId,
      req.user.userId,
      { status, category },
    );
  }

  // 获取进行中的目标
  @Get('active')
  async getActive(@Request() req) {
    return this.goalsService.getActiveGoals(req.user.familyId, req.user.userId);
  }

  // 获取即将到期的目标
  @Get('upcoming-deadlines')
  async getUpcomingDeadlines(@Query('days') days: string, @Request() req) {
    return this.goalsService.getUpcomingDeadlines(
      req.user.familyId,
      days ? parseInt(days) : 7,
    );
  }

  // 获取统计
  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.goalsService.getStatistics(req.user.familyId);
  }

  // 获取单个目标
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.goalsService.findById(id);
  }

  // 更新目标
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.goalsService.update(id, updateDto);
  }

  // 更新进度
  @Post(':id/progress')
  async updateProgress(
    @Param('id') id: string,
    @Body() body: { progress?: number; currentValue?: number; content: string; images?: string[] },
    @Request() req,
  ) {
    return this.goalsService.updateProgress(id, req.user.userId, body);
  }

  // 更新状态
  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: GoalStatus },
  ) {
    return this.goalsService.updateStatus(id, body.status);
  }

  // 添加里程碑
  @Post(':id/milestones')
  async addMilestone(@Param('id') id: string, @Body() milestone: any) {
    return this.goalsService.addMilestone(id, milestone);
  }

  // 完成里程碑
  @Put(':id/milestones/:index/complete')
  async completeMilestone(
    @Param('id') id: string,
    @Param('index') index: string,
  ) {
    return this.goalsService.completeMilestone(id, parseInt(index));
  }

  // 删除里程碑
  @Delete(':id/milestones/:index')
  async deleteMilestone(
    @Param('id') id: string,
    @Param('index') index: string,
  ) {
    return this.goalsService.deleteMilestone(id, parseInt(index));
  }

  // 添加参与者
  @Post(':id/participants')
  async addParticipant(
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    return this.goalsService.addParticipant(id, body.userId);
  }

  // 移除参与者
  @Delete(':id/participants/:userId')
  async removeParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.goalsService.removeParticipant(id, userId);
  }

  // 删除目标
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.goalsService.delete(id);
    return { message: '已删除' };
  }
}


