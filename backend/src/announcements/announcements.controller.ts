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
import { AnnouncementsService } from './announcements.service';
import { AnnouncementPriority, AnnouncementStatus } from './schemas/announcement.schema';

@Controller('announcements')
@UseGuards(JwtAuthGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  // 创建公告
  @Post()
  async create(
    @Body()
    body: {
      title: string;
      content: string;
      priority?: AnnouncementPriority;
      isPinned?: boolean;
      mentions?: string[];
      requireConfirmation?: boolean;
      expiresAt?: string;
      attachments?: string[];
      tags?: string[];
      icon?: string;
      schedule?: { publishAt?: string; unpublishAt?: string };
    },
    @Request() req,
  ) {
    const data = {
      ...body,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      schedule: body.schedule
        ? {
            publishAt: body.schedule.publishAt ? new Date(body.schedule.publishAt) : undefined,
            unpublishAt: body.schedule.unpublishAt ? new Date(body.schedule.unpublishAt) : undefined,
          }
        : undefined,
    };
    return this.announcementsService.create(req.user.familyId, req.user.userId, data);
  }

  // 获取公告列表
  @Get()
  async findAll(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: AnnouncementStatus,
    @Query('priority') priority?: AnnouncementPriority,
  ) {
    return this.announcementsService.findByFamily(req.user.familyId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      priority,
    });
  }

  // 获取置顶公告
  @Get('pinned')
  async getPinned(@Request() req) {
    return this.announcementsService.getPinnedAnnouncements(req.user.familyId);
  }

  // 获取@我的公告
  @Get('mentioned')
  async getMentioned(@Request() req) {
    return this.announcementsService.getMentionedAnnouncements(req.user.familyId, req.user.userId);
  }

  // 获取未读数量
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.announcementsService.getUnreadCount(req.user.familyId, req.user.userId);
    return { count };
  }

  // 获取待确认公告
  @Get('pending-confirmations')
  async getPendingConfirmations(@Request() req) {
    return this.announcementsService.getPendingConfirmations(req.user.familyId, req.user.userId);
  }

  // 获取统计信息
  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.announcementsService.getStatistics(req.user.familyId);
  }

  // 获取单个公告
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.announcementsService.findById(id);
  }

  // 更新公告
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      title: string;
      content: string;
      priority: AnnouncementPriority;
      isPinned: boolean;
      mentions: string[];
      requireConfirmation: boolean;
      expiresAt: string;
      attachments: string[];
      tags: string[];
      icon: string;
      status: AnnouncementStatus;
    }>,
    @Request() req,
  ) {
    const data = {
      ...body,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    };
    return this.announcementsService.update(id, req.user.userId, data);
  }

  // 删除公告
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    await this.announcementsService.delete(id, req.user.userId);
    return { message: '删除成功' };
  }

  // 标记为已读
  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    return this.announcementsService.markAsRead(id, req.user.userId);
  }

  // 确认公告
  @Put(':id/confirm')
  async confirm(@Param('id') id: string, @Request() req) {
    return this.announcementsService.confirmAnnouncement(id, req.user.userId);
  }

  // 置顶/取消置顶
  @Put(':id/pin')
  async togglePin(@Param('id') id: string, @Request() req) {
    return this.announcementsService.togglePin(id, req.user.userId);
  }

  // 归档
  @Put(':id/archive')
  async archive(@Param('id') id: string, @Request() req) {
    return this.announcementsService.archive(id, req.user.userId);
  }

  // 添加评论
  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @Body() body: { content: string },
    @Request() req,
  ) {
    return this.announcementsService.addComment(id, req.user.userId, body.content);
  }

  // 删除评论
  @Delete(':id/comments/:commentId')
  async deleteComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Request() req,
  ) {
    return this.announcementsService.deleteComment(id, commentId, req.user.userId);
  }

  // 添加表情反应
  @Post(':id/reactions')
  async addReaction(
    @Param('id') id: string,
    @Body() body: { emoji: string },
    @Request() req,
  ) {
    return this.announcementsService.addReaction(id, req.user.userId, body.emoji);
  }

  // 移除表情反应
  @Delete(':id/reactions/:emoji')
  async removeReaction(
    @Param('id') id: string,
    @Param('emoji') emoji: string,
    @Request() req,
  ) {
    return this.announcementsService.removeReaction(id, req.user.userId, emoji);
  }
}
