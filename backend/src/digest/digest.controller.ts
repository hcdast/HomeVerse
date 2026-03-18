import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DigestService } from './digest.service';
import { DigestType } from './schemas/digest.schema';

@Controller('digest')
@UseGuards(JwtAuthGuard)
export class DigestController {
  constructor(private readonly digestService: DigestService) {}

  // ============= 摘要生成 =============

  // 手动生成日报
  @Post('generate/daily')
  async generateDaily(@Request() req) {
    return this.digestService.generateDailyDigest(req.user.familyId);
  }

  // 手动生成周报
  @Post('generate/weekly')
  async generateWeekly(@Request() req) {
    return this.digestService.generateWeeklyDigest(req.user.familyId);
  }

  // 手动生成月报
  @Post('generate/monthly')
  async generateMonthly(@Request() req) {
    return this.digestService.generateMonthlyDigest(req.user.familyId);
  }

  // ============= 摘要查询 =============

  // 获取摘要列表
  @Get()
  async getDigests(
    @Request() req,
    @Query('type') type?: DigestType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.digestService.getDigests(req.user.familyId, {
      type,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  // 获取最新摘要
  @Get('latest')
  async getLatest(@Request() req, @Query('type') type?: DigestType) {
    return this.digestService.getLatestDigest(req.user.familyId, type);
  }

  // 获取单个摘要
  @Get(':id')
  async getDigestById(@Param('id') id: string) {
    return this.digestService.getDigestById(id);
  }

  // 标记为已读
  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    return this.digestService.markAsRead(id, req.user.userId);
  }

  // ============= 订阅设置 =============

  // 获取订阅设置
  @Get('subscription/settings')
  async getSubscription(@Request() req) {
    return this.digestService.getSubscription(req.user.userId, req.user.familyId);
  }

  // 更新订阅设置
  @Put('subscription/settings')
  async updateSubscription(
    @Body()
    body: Partial<{
      dailyEnabled: boolean;
      weeklyEnabled: boolean;
      monthlyEnabled: boolean;
      preferredTime: string;
      emailEnabled: boolean;
      pushEnabled: boolean;
    }>,
    @Request() req,
  ) {
    return this.digestService.updateSubscription(req.user.userId, req.user.familyId, body);
  }
}
