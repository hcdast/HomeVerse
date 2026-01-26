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
import { MomentsService } from './moments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MomentType } from './schemas/moment.schema';

@Controller('moments')
@UseGuards(JwtAuthGuard)
export class MomentsController {
  constructor(private readonly momentsService: MomentsService) {}

  // 创建动态
  @Post()
  async create(@Body() createDto: any, @Request() req) {
    return this.momentsService.create({
      ...createDto,
      author: req.user.userId,
      familyId: req.user.familyId,
    });
  }

  // 获取动态列表
  @Get()
  async findAll(
    @Query('type') type: MomentType,
    @Query('limit') limit: string,
    @Query('skip') skip: string,
    @Request() req,
  ) {
    return this.momentsService.findByFamily(req.user.familyId, {
      type,
      limit: limit ? parseInt(limit) : 20,
      skip: skip ? parseInt(skip) : 0,
    });
  }

  // 获取置顶公告
  @Get('pinned')
  async getPinned(@Request() req) {
    return this.momentsService.getPinnedAnnouncements(req.user.familyId);
  }

  // 获取统计
  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.momentsService.getStatistics(req.user.familyId);
  }

  // 获取单个动态
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.momentsService.findById(id);
  }

  // 添加表情回复
  @Post(':id/reaction')
  async addReaction(
    @Param('id') id: string,
    @Body() body: { emoji: string },
    @Request() req,
  ) {
    return this.momentsService.addReaction(id, req.user.userId, body.emoji);
  }

  // 添加评论
  @Post(':id/comment')
  async addComment(
    @Param('id') id: string,
    @Body() body: { content: string },
    @Request() req,
  ) {
    return this.momentsService.addComment(id, req.user.userId, body.content);
  }

  // 删除评论
  @Delete(':id/comment/:commentIndex')
  async deleteComment(
    @Param('id') id: string,
    @Param('commentIndex') commentIndex: string,
    @Request() req,
  ) {
    return this.momentsService.deleteComment(
      id,
      parseInt(commentIndex),
      req.user.userId,
    );
  }

  // 点赞评论
  @Post(':id/comment/:commentIndex/like')
  async likeComment(
    @Param('id') id: string,
    @Param('commentIndex') commentIndex: string,
    @Request() req,
  ) {
    return this.momentsService.likeComment(
      id,
      parseInt(commentIndex),
      req.user.userId,
    );
  }

  // 切换置顶
  @Put(':id/pin')
  async togglePin(@Param('id') id: string) {
    return this.momentsService.togglePin(id);
  }

  // 更新动态
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any, @Request() req) {
    return this.momentsService.update(id, req.user.userId, updateDto);
  }

  // 删除动态
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    await this.momentsService.delete(id, req.user.userId);
    return { message: '已删除' };
  }
}

