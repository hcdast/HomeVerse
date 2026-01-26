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
import { LocationsService } from './locations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('locations')
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  // 更新我的位置
  @Post('update')
  async updateLocation(@Body() locationData: any, @Request() req) {
    return this.locationsService.updateLocation(
      req.user.userId,
      req.user.familyId,
      locationData,
    );
  }

  // 获取家庭成员位置
  @Get('family')
  async getFamilyLocations(@Request() req) {
    return this.locationsService.getFamilyLocations(req.user.familyId);
  }

  // 获取我的位置
  @Get('my')
  async getMyLocation(@Request() req) {
    return this.locationsService.getUserLocation(
      req.user.userId,
      req.user.familyId,
    );
  }

  // 切换位置分享
  @Put('sharing/toggle')
  async toggleSharing(@Request() req) {
    return this.locationsService.toggleSharing(
      req.user.userId,
      req.user.familyId,
    );
  }

  // 获取我的位置历史
  @Get('history')
  async getHistory(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit: string,
    @Request() req,
  ) {
    return this.locationsService.getLocationHistory(
      req.user.userId,
      req.user.familyId,
      {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      },
    );
  }

  // 获取成员位置历史
  @Get('history/:userId')
  async getMemberHistory(
    @Param('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit: string,
    @Request() req,
  ) {
    return this.locationsService.getLocationHistory(userId, req.user.familyId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  // ========== 每日路线 ==========

  // 获取家庭成员今日路线
  @Get('routes/today')
  async getTodayRoutes(@Request() req) {
    const dateKey = new Date().toISOString().split('T')[0];
    return this.locationsService.getFamilyDailyRoutes(
      req.user.familyId,
      dateKey,
    );
  }

  // 获取指定日期的家庭成员路线
  @Get('routes/date/:dateKey')
  async getDateRoutes(@Param('dateKey') dateKey: string, @Request() req) {
    return this.locationsService.getFamilyDailyRoutes(
      req.user.familyId,
      dateKey,
    );
  }

  // 获取我的指定日期路线
  @Get('routes/my/:dateKey')
  async getMyRoute(@Param('dateKey') dateKey: string, @Request() req) {
    return this.locationsService.getDailyRoute(
      req.user.userId,
      req.user.familyId,
      dateKey,
    );
  }

  // 获取成员的多日路线
  @Get('routes/member/:userId')
  async getMemberRoutes(
    @Param('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    const today = new Date().toISOString().split('T')[0];
    return this.locationsService.getUserRoutes(
      userId,
      req.user.familyId,
      startDate || today,
      endDate || today,
    );
  }

  // ========== 位置设置 ==========

  // 获取我的位置设置
  @Get('settings')
  async getSettings(@Request() req) {
    return this.locationsService.getOrCreateSettings(
      req.user.userId,
      req.user.familyId,
    );
  }

  // 更新我的位置设置
  @Put('settings')
  async updateSettings(@Body() updateDto: any, @Request() req) {
    return this.locationsService.updateSettings(
      req.user.userId,
      req.user.familyId,
      updateDto,
    );
  }

  // 获取统计
  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.locationsService.getStatistics(req.user.familyId);
  }

  // ========== 安全区域 ==========

  // 创建安全区域
  @Post('safe-zones')
  async createSafeZone(@Body() createDto: any, @Request() req) {
    return this.locationsService.createSafeZone({
      ...createDto,
      familyId: req.user.familyId,
      createdBy: req.user.userId,
    });
  }

  // 获取安全区域列表
  @Get('safe-zones')
  async getSafeZones(@Request() req) {
    return this.locationsService.getSafeZones(req.user.familyId);
  }

  // 更新安全区域
  @Put('safe-zones/:id')
  async updateSafeZone(@Param('id') id: string, @Body() updateDto: any) {
    return this.locationsService.updateSafeZone(id, updateDto);
  }

  // 删除安全区域
  @Delete('safe-zones/:id')
  async deleteSafeZone(@Param('id') id: string) {
    await this.locationsService.deleteSafeZone(id);
    return { message: '已删除' };
  }

  // 添加监控成员
  @Post('safe-zones/:id/members')
  async addWatchedMember(
    @Param('id') id: string,
    @Body() body: { memberId: string },
  ) {
    return this.locationsService.addWatchedMember(id, body.memberId);
  }

  // 移除监控成员
  @Delete('safe-zones/:id/members/:memberId')
  async removeWatchedMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.locationsService.removeWatchedMember(id, memberId);
  }
}
