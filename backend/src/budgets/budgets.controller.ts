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
import { BudgetsService } from './budgets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  // 获取或创建月度预算
  @Get('month/:year/:month')
  async getMonthBudget(
    @Param('year') year: string,
    @Param('month') month: string,
    @Request() req,
  ) {
    return this.budgetsService.getOrCreate(
      req.user.familyId,
      parseInt(year),
      parseInt(month),
      req.user.userId,
    );
  }

  // 更新总预算
  @Put('month/:year/:month/total')
  async updateTotal(
    @Param('year') year: string,
    @Param('month') month: string,
    @Body() body: { totalBudget: number },
    @Request() req,
  ) {
    return this.budgetsService.updateTotalBudget(
      req.user.familyId,
      parseInt(year),
      parseInt(month),
      body.totalBudget,
      req.user.userId,
    );
  }

  // 更新分类预算
  @Put('month/:year/:month/category')
  async updateCategory(
    @Param('year') year: string,
    @Param('month') month: string,
    @Body() categoryData: any,
    @Request() req,
  ) {
    return this.budgetsService.updateCategoryBudget(
      req.user.familyId,
      parseInt(year),
      parseInt(month),
      categoryData,
      req.user.userId,
    );
  }

  // 批量更新分类预算
  @Put('month/:year/:month/categories')
  async updateCategories(
    @Param('year') year: string,
    @Param('month') month: string,
    @Body() body: { categories: any[] },
    @Request() req,
  ) {
    return this.budgetsService.updateCategories(
      req.user.familyId,
      parseInt(year),
      parseInt(month),
      body.categories,
      req.user.userId,
    );
  }

  // 同步支出数据
  @Put('month/:year/:month/sync')
  async syncSpent(
    @Param('year') year: string,
    @Param('month') month: string,
    @Body() body: {
      spentByCategory: { category: string; spent: number }[];
      totalSpent: number;
      totalIncome: number;
    },
    @Request() req,
  ) {
    return this.budgetsService.syncSpentData(
      req.user.familyId,
      parseInt(year),
      parseInt(month),
      body.spentByCategory,
      body.totalSpent,
      body.totalIncome,
    );
  }

  // 获取预算警告
  @Get('month/:year/:month/alerts')
  async getAlerts(
    @Param('year') year: string,
    @Param('month') month: string,
    @Request() req,
  ) {
    return this.budgetsService.getAlerts(
      req.user.familyId,
      parseInt(year),
      parseInt(month),
    );
  }

  // 添加储蓄目标
  @Post('month/:year/:month/savings')
  async addSavingsGoal(
    @Param('year') year: string,
    @Param('month') month: string,
    @Body() goal: any,
    @Request() req,
  ) {
    return this.budgetsService.addSavingsGoal(
      req.user.familyId,
      parseInt(year),
      parseInt(month),
      goal,
      req.user.userId,
    );
  }

  // 更新储蓄目标进度
  @Put('month/:year/:month/savings/:index')
  async updateSavingsProgress(
    @Param('year') year: string,
    @Param('month') month: string,
    @Param('index') index: string,
    @Body() body: { currentAmount: number },
    @Request() req,
  ) {
    return this.budgetsService.updateSavingsProgress(
      req.user.familyId,
      parseInt(year),
      parseInt(month),
      parseInt(index),
      body.currentAmount,
    );
  }

  // 删除储蓄目标
  @Delete('month/:year/:month/savings/:index')
  async deleteSavingsGoal(
    @Param('year') year: string,
    @Param('month') month: string,
    @Param('index') index: string,
    @Request() req,
  ) {
    return this.budgetsService.deleteSavingsGoal(
      req.user.familyId,
      parseInt(year),
      parseInt(month),
      parseInt(index),
    );
  }

  // 获取年度统计
  @Get('year/:year')
  async getYearlyStats(@Param('year') year: string, @Request() req) {
    return this.budgetsService.getYearlyStatistics(
      req.user.familyId,
      parseInt(year),
    );
  }

  // 锁定/解锁预算
  @Put('month/:year/:month/lock')
  async toggleLock(
    @Param('year') year: string,
    @Param('month') month: string,
    @Request() req,
  ) {
    return this.budgetsService.toggleLock(
      req.user.familyId,
      parseInt(year),
      parseInt(month),
    );
  }

  // 复制到下个月
  @Post('month/:year/:month/copy')
  async copyToNextMonth(
    @Param('year') year: string,
    @Param('month') month: string,
    @Request() req,
  ) {
    return this.budgetsService.copyToNextMonth(
      req.user.familyId,
      parseInt(year),
      parseInt(month),
      req.user.userId,
    );
  }
}

