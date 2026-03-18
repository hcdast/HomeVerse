import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChallengesService } from './challenges.service';
import { ChallengeType, ChallengeStatus, ChallengeCategory } from './schemas/challenge.schema';

@Controller('challenges')
@UseGuards(JwtAuthGuard)
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  // 创建挑战
  @Post()
  async create(
    @Body()
    body: {
      title: string;
      description?: string;
      type: ChallengeType;
      category: ChallengeCategory;
      startDate: string;
      endDate: string;
      targetValue: number;
      unit?: string;
      participantIds?: string[];
      milestones?: any[];
      icon?: string;
      color?: string;
      coverImage?: string;
      tags?: string[];
      reward?: string;
      rewardPoints?: number;
      isTeamChallenge?: boolean;
      rules?: any;
    },
    @Request() req,
  ) {
    const data = {
      ...body,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    };
    return this.challengesService.create(req.user.familyId, req.user.userId, data);
  }

  // 获取挑战列表
  @Get()
  async findAll(
    @Request() req,
    @Query('status') status?: ChallengeStatus,
    @Query('category') category?: ChallengeCategory,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.challengesService.findByFamily(req.user.familyId, {
      status,
      category,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  // 获取我进行中的挑战
  @Get('active')
  async getActiveChallenges(@Request() req) {
    return this.challengesService.getActiveChallenges(req.user.familyId, req.user.userId);
  }

  // 获取统计信息
  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.challengesService.getStatistics(req.user.familyId, req.user.userId);
  }

  // 获取单个挑战
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.challengesService.findById(id);
  }

  // 获取排行榜
  @Get(':id/leaderboard')
  async getLeaderboard(@Param('id') id: string) {
    return this.challengesService.getLeaderboard(id);
  }

  // 打卡
  @Post(':id/check-in')
  async checkIn(
    @Param('id') id: string,
    @Body() body: { value: number; notes?: string; proofUrl?: string },
    @Request() req,
  ) {
    return this.challengesService.checkIn(id, req.user.userId, body);
  }

  // 加入挑战
  @Post(':id/join')
  async join(@Param('id') id: string, @Request() req) {
    return this.challengesService.join(id, req.user.userId);
  }

  // 退出挑战
  @Post(':id/leave')
  async leave(@Param('id') id: string, @Request() req) {
    return this.challengesService.leave(id, req.user.userId);
  }

  // 发送鼓励
  @Post(':id/encourage')
  async encourage(
    @Param('id') id: string,
    @Body() body: { message: string },
    @Request() req,
  ) {
    return this.challengesService.sendEncouragement(id, req.user.userId, body.message);
  }

  // 取消挑战
  @Put(':id/cancel')
  async cancel(@Param('id') id: string, @Request() req) {
    return this.challengesService.cancel(id, req.user.userId);
  }

  // 删除挑战
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    await this.challengesService.delete(id, req.user.userId);
    return { message: '删除成功' };
  }
}
