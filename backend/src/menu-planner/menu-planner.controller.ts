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
import { MenuPlannerService } from './menu-planner.service';
import { MealType } from './schemas/menu-planner.schema';

@Controller('menu-planner')
@UseGuards(JwtAuthGuard)
export class MenuPlannerController {
  constructor(private readonly menuPlannerService: MenuPlannerService) {}

  // ============= 每日餐单 =============

  // 获取某天餐单
  @Get('daily/:date')
  async getMealPlan(@Param('date') date: string, @Request() req) {
    return this.menuPlannerService.getMealPlanByDate(req.user.familyId, new Date(date));
  }

  // 获取日期范围餐单
  @Get('range')
  async getMealPlansInRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    return this.menuPlannerService.getMealPlansInRange(
      req.user.familyId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  // 更新某天餐单
  @Put('daily/:date')
  async updateMealPlan(
    @Param('date') date: string,
    @Body() body: { breakfast?: any[]; lunch?: any[]; dinner?: any[]; snack?: any[]; notes?: string },
    @Request() req,
  ) {
    return this.menuPlannerService.upsertMealPlan(
      req.user.familyId,
      new Date(date),
      body,
      req.user.userId,
    );
  }

  // 添加餐点
  @Post('daily/:date/:mealType')
  async addMealItem(
    @Param('date') date: string,
    @Param('mealType') mealType: MealType,
    @Body() body: { recipeId?: string; recipeName: string; note?: string },
    @Request() req,
  ) {
    return this.menuPlannerService.addMealItem(req.user.familyId, new Date(date), mealType, body);
  }

  // 标记餐点已完成
  @Put('daily/:date/:mealType/:index/cooked')
  async markMealCooked(
    @Param('date') date: string,
    @Param('mealType') mealType: MealType,
    @Param('index') index: string,
    @Request() req,
  ) {
    return this.menuPlannerService.markMealCooked(
      req.user.familyId,
      new Date(date),
      mealType,
      parseInt(index, 10),
      req.user.userId,
    );
  }

  // 删除餐点
  @Delete('daily/:date/:mealType/:index')
  async removeMealItem(
    @Param('date') date: string,
    @Param('mealType') mealType: MealType,
    @Param('index') index: string,
    @Request() req,
  ) {
    return this.menuPlannerService.removeMealItem(
      req.user.familyId,
      new Date(date),
      mealType,
      parseInt(index, 10),
    );
  }

  // ============= 周菜单计划 =============

  // 获取周计划列表
  @Get('plans')
  async getMenuPlans(@Request() req) {
    return this.menuPlannerService.getMenuPlans(req.user.familyId);
  }

  // 创建周计划
  @Post('plans')
  async createMenuPlan(
    @Body() body: { title: string; startDate: string; endDate: string; preferences?: any },
    @Request() req,
  ) {
    return this.menuPlannerService.createMenuPlan(
      req.user.familyId,
      { ...body, startDate: new Date(body.startDate), endDate: new Date(body.endDate) },
      req.user.userId,
    );
  }

  // AI生成周菜单
  @Post('generate')
  async generateMenu(
    @Body() body: { startDate: string; days?: number; preferences?: any },
    @Request() req,
  ) {
    return this.menuPlannerService.generateMenuWithAi(
      req.user.familyId,
      { ...body, startDate: new Date(body.startDate) },
      req.user.userId,
    );
  }

  // ============= 购物清单 =============

  // 生成购物清单
  @Get('shopping-list')
  async generateShoppingList(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    return this.menuPlannerService.generateShoppingList(
      req.user.familyId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  // ============= 统计 =============

  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.menuPlannerService.getStatistics(req.user.familyId);
  }
}
