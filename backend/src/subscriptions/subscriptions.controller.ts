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
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionType, SubscriptionStatus } from './schemas/subscription.schema';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // 创建订阅
  @Post()
  async create(@Body() body: any, @Request() req) {
    const data = {
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      nextBillingDate: body.nextBillingDate ? new Date(body.nextBillingDate) : undefined,
    };
    return this.subscriptionsService.create(req.user.familyId, req.user.userId, data);
  }

  // 获取订阅列表
  @Get()
  async findAll(
    @Request() req,
    @Query('status') status?: SubscriptionStatus,
    @Query('type') type?: SubscriptionType,
  ) {
    return this.subscriptionsService.findByFamily(req.user.familyId, { status, type });
  }

  // 获取即将续费的订阅
  @Get('upcoming')
  async getUpcoming(@Request() req, @Query('days') days?: string) {
    return this.subscriptionsService.getUpcomingRenewals(
      req.user.familyId,
      days ? parseInt(days, 10) : 7,
    );
  }

  // 获取统计信息
  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.subscriptionsService.getStatistics(req.user.familyId);
  }

  // 获取单个订阅
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.subscriptionsService.findById(id);
  }

  // 更新订阅
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const data = {
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      nextBillingDate: body.nextBillingDate ? new Date(body.nextBillingDate) : undefined,
    };
    return this.subscriptionsService.update(id, data);
  }

  // 记录付款
  @Post(':id/payment')
  async recordPayment(
    @Param('id') id: string,
    @Body() body: { amount: number; status: 'paid' | 'pending' | 'failed'; notes?: string },
  ) {
    return this.subscriptionsService.recordPayment(id, body);
  }

  // 暂停订阅
  @Put(':id/pause')
  async pause(@Param('id') id: string) {
    return this.subscriptionsService.pause(id);
  }

  // 恢复订阅
  @Put(':id/resume')
  async resume(@Param('id') id: string) {
    return this.subscriptionsService.resume(id);
  }

  // 取消订阅
  @Put(':id/cancel')
  async cancel(@Param('id') id: string) {
    return this.subscriptionsService.cancel(id);
  }

  // 删除订阅
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.subscriptionsService.delete(id);
    return { message: '删除成功' };
  }
}
