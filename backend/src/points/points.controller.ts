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
import { PointsService } from './points.service';
import { PointSource, PointTransactionType } from './schemas/point.schema';

@Controller('points')
@UseGuards(JwtAuthGuard)
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  // ============= 积分余额 =============

  // 获取我的积分余额
  @Get('balance')
  async getMyBalance(@Request() req) {
    return this.pointsService.getBalance(req.user.userId, req.user.familyId);
  }

  // 获取指定用户积分余额
  @Get('balance/:userId')
  async getUserBalance(@Param('userId') userId: string, @Request() req) {
    return this.pointsService.getBalance(userId, req.user.familyId);
  }

  // 获取家庭积分排行榜
  @Get('leaderboard')
  async getLeaderboard(@Request() req) {
    return this.pointsService.getFamilyLeaderboard(req.user.familyId);
  }

  // ============= 积分历史 =============

  // 获取我的积分历史
  @Get('history')
  async getMyHistory(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: PointTransactionType,
  ) {
    return this.pointsService.getPointHistory(req.user.userId, req.user.familyId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      type,
    });
  }

  // ============= 积分操作 =============

  // 积分转账
  @Post('transfer')
  async transferPoints(
    @Body() body: { toUserId: string; amount: number; description?: string },
    @Request() req,
  ) {
    return this.pointsService.transferPoints(
      req.user.userId,
      body.toUserId,
      req.user.familyId,
      body.amount,
      body.description,
    );
  }

  // 发放奖励积分（管理员）
  @Post('grant')
  async grantBonus(
    @Body() body: { userId: string; amount: number; description: string },
    @Request() req,
  ) {
    return this.pointsService.grantBonusPoints(
      body.userId,
      req.user.familyId,
      body.amount,
      body.description,
      req.user.userId,
    );
  }

  // ============= 奖励管理 =============

  // 获取奖励列表
  @Get('rewards')
  async getRewards(@Request() req, @Query('all') all?: string) {
    return this.pointsService.getRewards(req.user.familyId, all !== 'true');
  }

  // 创建奖励
  @Post('rewards')
  async createReward(
    @Body() body: { name: string; description?: string; icon?: string; cost: number; stock?: number },
    @Request() req,
  ) {
    return this.pointsService.createReward(req.user.familyId, body, req.user.userId);
  }

  // 更新奖励
  @Put('rewards/:id')
  async updateReward(
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; description: string; icon: string; cost: number; stock: number; isActive: boolean }>,
  ) {
    return this.pointsService.updateReward(id, body);
  }

  // 删除奖励
  @Delete('rewards/:id')
  async deleteReward(@Param('id') id: string) {
    return this.pointsService.deleteReward(id);
  }

  // ============= 兑换操作 =============

  // 兑换奖励
  @Post('redeem/:rewardId')
  async redeemReward(@Param('rewardId') rewardId: string, @Request() req) {
    return this.pointsService.redeemReward(req.user.userId, req.user.familyId, rewardId);
  }

  // 获取我的兑换记录
  @Get('redemptions')
  async getMyRedemptions(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.pointsService.getRedemptions(req.user.userId, req.user.familyId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  // 处理兑换申请（管理员）
  @Put('redemptions/:id/process')
  async processRedemption(
    @Param('id') id: string,
    @Body() body: { status: 'approved' | 'rejected' | 'completed'; notes?: string },
    @Request() req,
  ) {
    return this.pointsService.processRedemption(id, body.status, req.user.userId, body.notes);
  }

  // ============= 统计 =============

  // 获取积分统计
  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.pointsService.getStatistics(req.user.familyId);
  }

  // 获取等级配置
  @Get('levels')
  async getLevelConfig() {
    return this.pointsService.getLevelConfig();
  }
}
