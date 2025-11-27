import { Controller, Get, Put, Delete, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueryNotificationsDto } from './dto/notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // 获取当前用户的通知列表
  @Get()
  async getNotifications(@Request() req, @Query() query: QueryNotificationsDto) {
    return this.notificationsService.findByUser(req.user.userId, query);
  }

  // 获取未读通知数量
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.notificationsService.getUnreadCount(req.user.userId);
    return { count };
  }

  // 标记单个通知为已读
  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.userId);
  }

  // 标记所有通知为已读
  @Put('mark-all-read')
  async markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  // 删除单个通知
  @Delete(':id')
  async deleteNotification(@Param('id') id: string, @Request() req) {
    await this.notificationsService.delete(id, req.user.userId);
    return { message: '通知已删除' };
  }

  // 清空已读通知
  @Delete('clear-read')
  async clearRead(@Request() req) {
    return this.notificationsService.clearRead(req.user.userId);
  }
}

