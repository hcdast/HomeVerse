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
import { TimeCapsuleService } from './time-capsule.service';
import { CapsuleStatus, ContentType } from './schemas/time-capsule.schema';

@Controller('time-capsule')
@UseGuards(JwtAuthGuard)
export class TimeCapsuleController {
  constructor(private readonly timeCapsuleService: TimeCapsuleService) {}

  // 创建时间胶囊
  @Post()
  async create(
    @Body()
    body: {
      title: string;
      description?: string;
      openDate: string;
      coverImage?: string;
      theme?: string;
      tags?: string[];
      isPublic?: boolean;
      allowLateContributions?: boolean;
      contributorIds?: string[];
      settings?: any;
    },
    @Request() req,
  ) {
    const data = {
      ...body,
      openDate: new Date(body.openDate),
    };
    return this.timeCapsuleService.create(req.user.familyId, req.user.userId, data);
  }

  // 获取胶囊列表
  @Get()
  async findAll(
    @Request() req,
    @Query('status') status?: CapsuleStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.timeCapsuleService.findByFamily(req.user.familyId, {
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  // 获取统计信息
  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.timeCapsuleService.getStatistics(req.user.familyId);
  }

  // 获取单个胶囊
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.timeCapsuleService.findById(id, req.user.userId);
  }

  // 封存胶囊
  @Put(':id/seal')
  async seal(@Param('id') id: string, @Request() req) {
    return this.timeCapsuleService.seal(id, req.user.userId);
  }

  // 开启胶囊
  @Put(':id/open')
  async open(@Param('id') id: string, @Request() req) {
    return this.timeCapsuleService.open(id, req.user.userId);
  }

  // 添加内容
  @Post(':id/contents')
  async addContent(
    @Param('id') id: string,
    @Body()
    body: {
      type: ContentType;
      text?: string;
      fileUrl?: string;
      fileName?: string;
      thumbnail?: string;
    },
    @Request() req,
  ) {
    return this.timeCapsuleService.addContent(id, req.user.userId, body);
  }

  // 删除内容
  @Delete(':id/contents/:contentId')
  async removeContent(
    @Param('id') id: string,
    @Param('contentId') contentId: string,
    @Request() req,
  ) {
    return this.timeCapsuleService.removeContent(id, contentId, req.user.userId);
  }

  // 邀请贡献者
  @Post(':id/invite')
  async inviteContributors(
    @Param('id') id: string,
    @Body() body: { contributorIds: string[] },
    @Request() req,
  ) {
    return this.timeCapsuleService.inviteContributors(id, req.user.userId, body.contributorIds);
  }

  // 添加反应
  @Post(':id/reactions')
  async addReaction(
    @Param('id') id: string,
    @Body() body: { emotion: string; comment?: string },
    @Request() req,
  ) {
    return this.timeCapsuleService.addReaction(id, req.user.userId, body);
  }

  // 删除胶囊
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    await this.timeCapsuleService.delete(id, req.user.userId);
    return { message: '删除成功' };
  }
}
