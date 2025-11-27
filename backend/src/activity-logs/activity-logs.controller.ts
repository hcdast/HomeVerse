import { Controller, Get, Query, UseGuards, Request, Param, ForbiddenException } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { QueryActivityLogsDto } from './dto/activity-log.dto';

@Controller('activity-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  // 获取家庭活动日志（需要管理员权限）
  @Get('family')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async getFamilyLogs(@Request() req, @Query() query: QueryActivityLogsDto) {
    if (!req.user.familyId) {
      throw new ForbiddenException('用户未加入任何家庭');
    }
    return this.activityLogsService.findByFamily(req.user.familyId, query);
  }

  // 获取当前用户的活动日志
  @Get('my-logs')
  async getMyLogs(@Request() req, @Query() query: QueryActivityLogsDto) {
    return this.activityLogsService.findByUser(req.user.userId, query);
  }

  // 获取家庭活动统计（需要管理员权限）
  @Get('family/statistics')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async getFamilyStatistics(@Request() req, @Query('days') days?: string) {
    if (!req.user.familyId) {
      throw new ForbiddenException('用户未加入任何家庭');
    }
    return this.activityLogsService.getStatistics(
      req.user.familyId,
      days ? parseInt(days) : 7,
    );
  }
}

