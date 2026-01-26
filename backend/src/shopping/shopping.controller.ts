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
import { ShoppingService } from './shopping.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShoppingStatus } from './schemas/shopping-item.schema';

@Controller('shopping')
@UseGuards(JwtAuthGuard)
export class ShoppingController {
  constructor(private readonly shoppingService: ShoppingService) {}

  // 创建购物项
  @Post()
  async create(@Body() createDto: any, @Request() req) {
    return this.shoppingService.create({
      ...createDto,
      familyId: req.user.familyId,
      createdBy: req.user.userId,
    });
  }

  // 获取购物清单
  @Get()
  async findAll(
    @Query('status') status: ShoppingStatus,
    @Query('category') category: string,
    @Request() req,
  ) {
    return this.shoppingService.findByFamily(req.user.familyId, {
      status,
      category,
    });
  }

  // 获取待购买清单
  @Get('pending')
  async getPending(@Request() req) {
    return this.shoppingService.getPendingList(req.user.familyId);
  }

  // 获取购买历史
  @Get('history')
  async getHistory(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.shoppingService.getPurchasedHistory(req.user.familyId, start, end);
  }

  // 获取统计信息
  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.shoppingService.getStatistics(req.user.familyId);
  }

  // 标记为已购买
  @Put(':id/purchase')
  async markAsPurchased(
    @Param('id') id: string,
    @Body() body: { actualPrice?: number },
    @Request() req,
  ) {
    return this.shoppingService.markAsPurchased(id, req.user.userId, body.actualPrice);
  }

  // 取消购物项
  @Put(':id/cancel')
  async cancel(@Param('id') id: string) {
    return this.shoppingService.cancel(id);
  }

  // 分配给某人
  @Put(':id/assign')
  async assign(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.shoppingService.assignTo(id, body.userId);
  }

  // 更新购物项
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.shoppingService.update(id, updateDto);
  }

  // 删除购物项
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.shoppingService.delete(id);
    return { message: '已删除' };
  }
}

