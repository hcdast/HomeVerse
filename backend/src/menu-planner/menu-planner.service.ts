import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MealPlan,
  MealPlanDocument,
  MenuPlan,
  MenuPlanDocument,
  ShoppingListGeneration,
  ShoppingListGenerationDocument,
  MealType,
} from './schemas/menu-planner.schema';
import { AiService } from '../ai/ai.service';

@Injectable()
export class MenuPlannerService {
  private readonly logger = new Logger(MenuPlannerService.name);

  constructor(
    @InjectModel(MealPlan.name) private mealPlanModel: Model<MealPlanDocument>,
    @InjectModel(MenuPlan.name) private menuPlanModel: Model<MenuPlanDocument>,
    @InjectModel(ShoppingListGeneration.name) private shoppingGenModel: Model<ShoppingListGenerationDocument>,
    @InjectModel('Recipe') private recipeModel: Model<any>,
    private aiService: AiService,
  ) {}

  // ============= 每日餐单 =============

  // 获取某天的餐单
  async getMealPlanByDate(familyId: string, date: Date): Promise<MealPlanDocument | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    return this.mealPlanModel
      .findOne({
        familyId: new Types.ObjectId(familyId),
        date: startOfDay,
      })
      .populate('breakfast.recipeId', 'name photos cookingTime')
      .populate('lunch.recipeId', 'name photos cookingTime')
      .populate('dinner.recipeId', 'name photos cookingTime')
      .populate('snack.recipeId', 'name photos cookingTime')
      .exec();
  }

  // 获取日期范围内的餐单
  async getMealPlansInRange(familyId: string, startDate: Date, endDate: Date): Promise<MealPlanDocument[]> {
    return this.mealPlanModel
      .find({
        familyId: new Types.ObjectId(familyId),
        date: { $gte: startDate, $lte: endDate },
      })
      .populate('breakfast.recipeId', 'name photos')
      .populate('lunch.recipeId', 'name photos')
      .populate('dinner.recipeId', 'name photos')
      .sort({ date: 1 })
      .exec();
  }

  // 创建或更新餐单
  async upsertMealPlan(
    familyId: string,
    date: Date,
    data: {
      breakfast?: any[];
      lunch?: any[];
      dinner?: any[];
      snack?: any[];
      notes?: string;
    },
    userId: string,
  ): Promise<MealPlanDocument> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const updateData: any = { ...data };
    if (!updateData.createdBy) {
      updateData.createdBy = new Types.ObjectId(userId);
    }

    return this.mealPlanModel.findOneAndUpdate(
      {
        familyId: new Types.ObjectId(familyId),
        date: startOfDay,
      },
      { $set: updateData },
      { upsert: true, new: true },
    );
  }

  // 添加餐点
  async addMealItem(
    familyId: string,
    date: Date,
    mealType: MealType,
    item: { recipeId?: string; recipeName: string; note?: string },
  ): Promise<MealPlanDocument> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const mealItem: any = {
      recipeName: item.recipeName,
      note: item.note || '',
      isCooked: false,
    };

    if (item.recipeId) {
      mealItem.recipeId = new Types.ObjectId(item.recipeId);
    }

    return this.mealPlanModel.findOneAndUpdate(
      {
        familyId: new Types.ObjectId(familyId),
        date: startOfDay,
      },
      {
        $push: { [mealType]: mealItem },
        $setOnInsert: { createdBy: null },
      },
      { upsert: true, new: true },
    );
  }

  // 标记餐点已完成
  async markMealCooked(
    familyId: string,
    date: Date,
    mealType: MealType,
    index: number,
    userId: string,
  ): Promise<MealPlanDocument> {
    const mealPlan = await this.getMealPlanByDate(familyId, date);
    if (!mealPlan) {
      throw new NotFoundException('餐单不存在');
    }

    const meals = mealPlan[mealType];
    if (!meals || !meals[index]) {
      throw new NotFoundException('餐点不存在');
    }

    meals[index].isCooked = true;
    meals[index].cookedAt = new Date();
    meals[index].cookedBy = new Types.ObjectId(userId);

    return mealPlan.save();
  }

  // 删除餐点
  async removeMealItem(familyId: string, date: Date, mealType: MealType, index: number): Promise<MealPlanDocument> {
    const mealPlan = await this.getMealPlanByDate(familyId, date);
    if (!mealPlan) {
      throw new NotFoundException('餐单不存在');
    }

    const meals = mealPlan[mealType];
    if (meals && meals[index]) {
      meals.splice(index, 1);
    }

    return mealPlan.save();
  }

  // ============= 周菜单计划 =============

  // 创建周计划
  async createMenuPlan(
    familyId: string,
    data: {
      title: string;
      startDate: Date;
      endDate: Date;
      preferences?: any;
    },
    userId: string,
  ): Promise<MenuPlanDocument> {
    const menuPlan = new this.menuPlanModel({
      ...data,
      familyId: new Types.ObjectId(familyId),
      createdBy: new Types.ObjectId(userId),
    });

    return menuPlan.save();
  }

  // 获取周计划列表
  async getMenuPlans(familyId: string): Promise<MenuPlanDocument[]> {
    return this.menuPlanModel
      .find({ familyId: new Types.ObjectId(familyId) })
      .sort({ startDate: -1 })
      .limit(20)
      .exec();
  }

  // AI生成周菜单
  async generateMenuWithAi(
    familyId: string,
    options: {
      startDate: Date;
      days?: number;
      preferences?: {
        excludeIngredients?: string[];
        dietaryRestrictions?: string[];
        budget?: number;
        servings?: number;
      };
    },
    userId: string,
  ): Promise<{ menuPlan: MenuPlanDocument; mealPlans: MealPlanDocument[] }> {
    const { startDate, days = 7, preferences = {} } = options;

    // 获取家庭食谱库
    const recipes = await this.recipeModel
      .find({ familyId: new Types.ObjectId(familyId) })
      .select('name ingredients cookingTime difficulty tags')
      .limit(50)
      .exec();

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days - 1);

    // 创建菜单计划
    const menuPlan = await this.createMenuPlan(
      familyId,
      {
        title: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()} 菜单`,
        startDate,
        endDate,
        preferences,
      },
      userId,
    );
    menuPlan.isAiGenerated = true;

    let aiSuggestions: any[] = [];

    // 如果AI服务可用，使用AI生成
    if (this.aiService.isConfigured()) {
      try {
        const prompt = this.buildMenuPrompt(recipes, days, preferences);
        const response = await this.aiService.generateArticleContent(prompt);
        aiSuggestions = this.parseAiMenuResponse(response, days);
      } catch (err) {
        this.logger.warn('AI生成菜单失败，使用随机推荐', err);
        aiSuggestions = this.generateRandomMenu(recipes, days);
      }
    } else {
      aiSuggestions = this.generateRandomMenu(recipes, days);
    }

    // 创建每日餐单
    const mealPlans: MealPlanDocument[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const dayPlan = aiSuggestions[i] || { breakfast: [], lunch: [], dinner: [] };
      const mealPlan = await this.upsertMealPlan(familyId, date, dayPlan, userId);
      mealPlans.push(mealPlan);
    }

    await menuPlan.save();

    return { menuPlan, mealPlans };
  }

  private buildMenuPrompt(recipes: any[], days: number, preferences: any): string {
    const recipeList = recipes.map((r) => `- ${r.name} (${r.cookingTime}分钟, ${r.difficulty})`).join('\n');
    const restrictions = preferences.dietaryRestrictions?.join('、') || '无';
    const excludes = preferences.excludeIngredients?.join('、') || '无';

    return `请为家庭规划${days}天的菜单。

可用食谱：
${recipeList}

要求：
- 饮食限制：${restrictions}
- 排除食材：${excludes}
- 人数：${preferences.servings || 4}人
- 每天包含早餐、午餐、晚餐

请按以下JSON格式返回：
[
  { "day": 1, "breakfast": ["食谱名"], "lunch": ["食谱名"], "dinner": ["食谱名"] },
  ...
]

只返回JSON数组，不要其他内容。`;
  }

  private parseAiMenuResponse(response: string, days: number): any[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((day: any) => ({
          breakfast: (day.breakfast || []).map((name: string) => ({ recipeName: name })),
          lunch: (day.lunch || []).map((name: string) => ({ recipeName: name })),
          dinner: (day.dinner || []).map((name: string) => ({ recipeName: name })),
        }));
      }
    } catch (e) {
      this.logger.warn('解析AI响应失败', e);
    }

    return this.generateRandomMenu([], days);
  }

  private generateRandomMenu(recipes: any[], days: number): any[] {
    const defaultMeals = {
      breakfast: ['豆浆油条', '鸡蛋面', '粥+包子', '牛奶麦片', '煎蛋三明治'],
      lunch: ['红烧肉', '清炒时蔬', '番茄鸡蛋面', '宫保鸡丁', '鱼香肉丝'],
      dinner: ['清蒸鱼', '蒜蓉西兰花', '排骨汤', '麻婆豆腐', '糖醋排骨'],
    };

    const result = [];
    for (let i = 0; i < days; i++) {
      result.push({
        breakfast: [{ recipeName: defaultMeals.breakfast[i % defaultMeals.breakfast.length] }],
        lunch: [{ recipeName: defaultMeals.lunch[i % defaultMeals.lunch.length] }],
        dinner: [{ recipeName: defaultMeals.dinner[i % defaultMeals.dinner.length] }],
      });
    }

    return result;
  }

  // ============= 购物清单生成 =============

  // 根据菜单生成购物清单
  async generateShoppingList(familyId: string, startDate: Date, endDate: Date): Promise<any[]> {
    const mealPlans = await this.getMealPlansInRange(familyId, startDate, endDate);
    const ingredientMap = new Map<string, { amount: number; unit: string; category: string }>();

    for (const plan of mealPlans) {
      const allMeals = [...(plan.breakfast || []), ...(plan.lunch || []), ...(plan.dinner || []), ...(plan.snack || [])];

      for (const meal of allMeals) {
        if (meal.recipeId) {
          const recipe = await this.recipeModel.findById(meal.recipeId);
          if (recipe?.ingredients) {
            for (const ing of recipe.ingredients) {
              const key = ing.name.toLowerCase();
              if (ingredientMap.has(key)) {
                const existing = ingredientMap.get(key)!;
                existing.amount += parseFloat(ing.amount) || 1;
              } else {
                ingredientMap.set(key, {
                  amount: parseFloat(ing.amount) || 1,
                  unit: ing.unit || '',
                  category: this.categorizeIngredient(ing.name),
                });
              }
            }
          }
        }
      }
    }

    return Array.from(ingredientMap.entries()).map(([name, data]) => ({
      name,
      amount: data.amount.toString(),
      unit: data.unit,
      category: data.category,
    }));
  }

  private categorizeIngredient(name: string): string {
    const categories: Record<string, string[]> = {
      蔬菜: ['白菜', '青菜', '西兰花', '胡萝卜', '土豆', '番茄', '黄瓜', '洋葱', '大蒜', '生姜'],
      肉类: ['猪肉', '牛肉', '鸡肉', '排骨', '五花肉', '肉末', '鸡翅', '鸡腿'],
      海鲜: ['鱼', '虾', '蟹', '贝', '鱿鱼', '海带'],
      蛋奶: ['鸡蛋', '牛奶', '酸奶', '奶酪'],
      调料: ['盐', '糖', '酱油', '醋', '料酒', '味精', '花椒', '八角'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((kw) => name.includes(kw))) {
        return category;
      }
    }

    return '其他';
  }

  // 获取统计信息
  async getStatistics(familyId: string): Promise<{
    totalMealsPlanned: number;
    totalMealsCooked: number;
    thisWeekPlanned: number;
    favoriteRecipes: { name: string; count: number }[];
  }> {
    const familyObjId = new Types.ObjectId(familyId);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [allPlans, weekPlans] = await Promise.all([
      this.mealPlanModel.find({ familyId: familyObjId }),
      this.mealPlanModel.find({ familyId: familyObjId, date: { $gte: weekStart } }),
    ]);

    let totalMealsPlanned = 0;
    let totalMealsCooked = 0;
    const recipeCount = new Map<string, number>();

    for (const plan of allPlans) {
      const allMeals = [...(plan.breakfast || []), ...(plan.lunch || []), ...(plan.dinner || []), ...(plan.snack || [])];
      totalMealsPlanned += allMeals.length;
      totalMealsCooked += allMeals.filter((m) => m.isCooked).length;

      for (const meal of allMeals) {
        if (meal.recipeName) {
          recipeCount.set(meal.recipeName, (recipeCount.get(meal.recipeName) || 0) + 1);
        }
      }
    }

    let thisWeekPlanned = 0;
    for (const plan of weekPlans) {
      const allMeals = [...(plan.breakfast || []), ...(plan.lunch || []), ...(plan.dinner || []), ...(plan.snack || [])];
      thisWeekPlanned += allMeals.length;
    }

    const favoriteRecipes = Array.from(recipeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return { totalMealsPlanned, totalMealsCooked, thisWeekPlanned, favoriteRecipes };
  }
}
