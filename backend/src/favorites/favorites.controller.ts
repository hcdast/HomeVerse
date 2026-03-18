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
import { FavoritesService } from './favorites.service';
import { FavoriteType } from './schemas/favorite.schema';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  // ============= 收藏项 =============

  // 添加收藏
  @Post()
  async addFavorite(
    @Body()
    body: {
      type: FavoriteType;
      itemId: string;
      title: string;
      description?: string;
      thumbnail?: string;
      url?: string;
      tags?: string[];
      notes?: string;
      collectionId?: string;
    },
    @Request() req,
  ) {
    return this.favoritesService.addFavorite(req.user.userId, req.user.familyId, body);
  }

  // 获取收藏列表
  @Get()
  async getFavorites(
    @Request() req,
    @Query('type') type?: FavoriteType,
    @Query('collectionId') collectionId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.favoritesService.getFavorites(req.user.userId, {
      type,
      collectionId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
    });
  }

  // 检查收藏状态
  @Get('check/:type/:itemId')
  async checkFavoriteStatus(
    @Param('type') type: FavoriteType,
    @Param('itemId') itemId: string,
    @Request() req,
  ) {
    const isFavorited = await this.favoritesService.isFavorited(req.user.userId, itemId, type);
    return { isFavorited };
  }

  // 批量检查收藏状态
  @Post('check-batch')
  async checkBatch(
    @Body() body: { items: { itemId: string; type: FavoriteType }[] },
    @Request() req,
  ) {
    return this.favoritesService.checkFavoriteStatus(req.user.userId, body.items);
  }

  // 获取统计信息
  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.favoritesService.getStatistics(req.user.userId);
  }

  // 更新收藏备注
  @Put(':id/notes')
  async updateNotes(
    @Param('id') id: string,
    @Body() body: { notes: string },
  ) {
    return this.favoritesService.updateFavoriteNotes(id, body.notes);
  }

  // 切换置顶
  @Put(':id/pin')
  async togglePin(@Param('id') id: string) {
    return this.favoritesService.togglePin(id);
  }

  // 移动到收藏夹
  @Put(':id/move')
  async moveToCollection(
    @Param('id') id: string,
    @Body() body: { collectionIds: string[] },
  ) {
    return this.favoritesService.moveToCollection(id, body.collectionIds);
  }

  // 取消收藏
  @Delete(':type/:itemId')
  async removeFavorite(
    @Param('type') type: FavoriteType,
    @Param('itemId') itemId: string,
    @Request() req,
  ) {
    await this.favoritesService.removeFavorite(req.user.userId, itemId, type);
    return { message: '取消收藏成功' };
  }

  // ============= 收藏夹 =============

  // 创建收藏夹
  @Post('collections')
  async createCollection(
    @Body()
    body: {
      name: string;
      description?: string;
      icon?: string;
      color?: string;
      isPrivate?: boolean;
      parentId?: string;
    },
    @Request() req,
  ) {
    return this.favoritesService.createCollection(req.user.userId, req.user.familyId, body);
  }

  // 获取收藏夹列表
  @Get('collections')
  async getCollections(@Request() req, @Query('parentId') parentId?: string) {
    return this.favoritesService.getCollections(req.user.userId, parentId);
  }

  // 获取收藏夹详情
  @Get('collections/:id')
  async getCollectionById(@Param('id') id: string) {
    return this.favoritesService.getCollectionById(id);
  }

  // 更新收藏夹
  @Put('collections/:id')
  async updateCollection(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      icon?: string;
      color?: string;
      isPrivate?: boolean;
    },
  ) {
    return this.favoritesService.updateCollection(id, body);
  }

  // 删除收藏夹
  @Delete('collections/:id')
  async deleteCollection(@Param('id') id: string) {
    await this.favoritesService.deleteCollection(id);
    return { message: '删除成功' };
  }
}
