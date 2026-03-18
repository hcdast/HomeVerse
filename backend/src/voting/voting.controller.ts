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
import { VotingService } from './voting.service';
import { VoteType, VoteStatus } from './schemas/voting.schema';

@Controller('voting')
@UseGuards(JwtAuthGuard)
export class VotingController {
  constructor(private readonly votingService: VotingService) {}

  // 创建投票
  @Post()
  async create(
    @Body()
    body: {
      title: string;
      description?: string;
      type?: VoteType;
      options: { text: string; description?: string; image?: string }[];
      expiresAt?: string;
      isAnonymous?: boolean;
      allowChangeVote?: boolean;
      maxSelections?: number;
      category?: string;
      tags?: string[];
      icon?: string;
    },
    @Request() req,
  ) {
    const data = {
      ...body,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    };
    return this.votingService.create(req.user.familyId, req.user.userId, data);
  }

  // 获取投票列表
  @Get()
  async findAll(
    @Request() req,
    @Query('status') status?: VoteStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.votingService.findByFamily(req.user.familyId, {
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  // 获取进行中的投票
  @Get('active')
  async getActive(@Request() req) {
    return this.votingService.getActiveVotes(req.user.familyId);
  }

  // 获取统计信息
  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.votingService.getStatistics(req.user.familyId);
  }

  // 获取单个投票
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.votingService.findById(id);
  }

  // 投票
  @Post(':id/vote')
  async castVote(
    @Param('id') id: string,
    @Body() body: { optionIds: string[] },
    @Request() req,
  ) {
    return this.votingService.castVote(id, req.user.userId, body.optionIds);
  }

  // 撤回投票
  @Post(':id/withdraw')
  async withdrawVote(@Param('id') id: string, @Request() req) {
    return this.votingService.withdrawVote(id, req.user.userId);
  }

  // 关闭投票
  @Put(':id/close')
  async closeVote(@Param('id') id: string, @Request() req) {
    return this.votingService.closeVote(id, req.user.userId);
  }

  // 添加选项
  @Post(':id/options')
  async addOption(
    @Param('id') id: string,
    @Body() body: { text: string; description?: string; image?: string },
    @Request() req,
  ) {
    return this.votingService.addOption(id, req.user.userId, body);
  }

  // 删除投票
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    await this.votingService.delete(id, req.user.userId);
    return { message: '删除成功' };
  }
}
