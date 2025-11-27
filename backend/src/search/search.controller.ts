import { Controller, Get, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { SearchService, SearchOptions } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // 全局搜索
  @Get()
  async search(@Request() req, @Query() query: any) {
    const { keyword, type, page, limit } = query;

    if (!keyword) {
      throw new BadRequestException('搜索关键词不能为空');
    }

    if (!req.user.familyId) {
      throw new BadRequestException('用户未加入任何家庭');
    }

    const options: SearchOptions = {
      keyword: keyword.trim(),
      type: type || 'all',
      familyId: req.user.familyId,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    };

    return this.searchService.search(options);
  }

  // 高级搜索
  @Get('advanced')
  async advancedSearch(@Request() req, @Query() query: any) {
    const { keyword, type, startDate, endDate, tags, page, limit } = query;

    if (!keyword) {
      throw new BadRequestException('搜索关键词不能为空');
    }

    if (!req.user.familyId) {
      throw new BadRequestException('用户未加入任何家庭');
    }

    const options: SearchOptions = {
      keyword: keyword.trim(),
      type: type || 'all',
      familyId: req.user.familyId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    };

    return this.searchService.advancedSearch(options);
  }

  // 获取热门标签
  @Get('tags/popular')
  async getPopularTags(@Request() req, @Query('limit') limit?: string) {
    if (!req.user.familyId) {
      throw new BadRequestException('用户未加入任何家庭');
    }

    return this.searchService.getPopularTags(
      req.user.familyId,
      limit ? parseInt(limit) : 10,
    );
  }
}

