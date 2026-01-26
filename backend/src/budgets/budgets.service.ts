import { Injectable, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Budget, BudgetDocument, CategoryBudget, SavingsGoal } from './schemas/budget.schema';

@Injectable()
export class BudgetsService {
  private readonly logger = new Logger(BudgetsService.name);

  // 默认预算分类
  private readonly defaultCategories: Partial<CategoryBudget>[] = [
    { category: '餐饮', icon: '🍽️', color: '#e74c3c', alertThreshold: 80 },
    { category: '交通', icon: '🚗', color: '#3498db', alertThreshold: 80 },
    { category: '购物', icon: '🛍️', color: '#9b59b6', alertThreshold: 80 },
    { category: '娱乐', icon: '🎮', color: '#f39c12', alertThreshold: 80 },
    { category: '教育', icon: '📚', color: '#1abc9c', alertThreshold: 80 },
    { category: '医疗', icon: '🏥', color: '#e91e63', alertThreshold: 90 },
    { category: '居住', icon: '🏠', color: '#607d8b', alertThreshold: 95 },
    { category: '其他', icon: '📦', color: '#95a5a6', alertThreshold: 80 },
  ];

  constructor(
    @InjectModel(Budget.name) private budgetModel: Model<BudgetDocument>,
  ) {}

  // 创建或获取月度预算
  async getOrCreate(
    familyId: string,
    year: number,
    month: number,
    createdBy: string,
  ): Promise<BudgetDocument> {
    let budget = await this.budgetModel.findOne({ familyId, year, month });

    if (!budget) {
      // 创建新的预算，复制上个月的设置
      const lastMonth = month === 1 ? 12 : month - 1;
      const lastYear = month === 1 ? year - 1 : year;
      const previousBudget = await this.budgetModel.findOne({
        familyId,
        year: lastYear,
        month: lastMonth,
      });

      const categories = previousBudget
        ? previousBudget.categories.map((c) => ({
            ...c,
            spent: 0,
          }))
        : this.defaultCategories.map((c) => ({
            ...c,
            budgetAmount: 0,
            spent: 0,
          }));

      budget = new this.budgetModel({
        familyId,
        year,
        month,
        createdBy,
        categories,
        totalBudget: previousBudget?.totalBudget || 0,
        savingsGoals: previousBudget?.savingsGoals?.map((g) => ({
          ...g,
          // 保留目标，不重置进度
        })) || [],
      });

      await budget.save();
    }

    return budget;
  }

  // 获取月度预算
  async findByMonth(
    familyId: string,
    year: number,
    month: number,
  ): Promise<BudgetDocument | null> {
    return this.budgetModel
      .findOne({ familyId, year, month })
      .populate('createdBy', 'username avatar')
      .exec();
  }

  // 更新总预算
  async updateTotalBudget(
    familyId: string,
    year: number,
    month: number,
    totalBudget: number,
    createdBy: string,
  ): Promise<BudgetDocument> {
    const budget = await this.getOrCreate(familyId, year, month, createdBy);
    if (budget.isLocked) {
      throw new ConflictException('预算已锁定，无法修改');
    }
    budget.totalBudget = totalBudget;
    return budget.save();
  }

  // 更新分类预算
  async updateCategoryBudget(
    familyId: string,
    year: number,
    month: number,
    categoryData: CategoryBudget,
    createdBy: string,
  ): Promise<BudgetDocument> {
    const budget = await this.getOrCreate(familyId, year, month, createdBy);
    if (budget.isLocked) {
      throw new ConflictException('预算已锁定，无法修改');
    }

    const existingIndex = budget.categories.findIndex(
      (c) => c.category === categoryData.category,
    );

    if (existingIndex > -1) {
      budget.categories[existingIndex] = {
        ...budget.categories[existingIndex],
        ...categoryData,
      };
    } else {
      budget.categories.push(categoryData as any);
    }

    return budget.save();
  }

  // 批量更新分类预算
  async updateCategories(
    familyId: string,
    year: number,
    month: number,
    categories: CategoryBudget[],
    createdBy: string,
  ): Promise<BudgetDocument> {
    const budget = await this.getOrCreate(familyId, year, month, createdBy);
    if (budget.isLocked) {
      throw new ConflictException('预算已锁定，无法修改');
    }

    budget.categories = categories as any;
    return budget.save();
  }

  // 更新分类支出（从财务模块同步）
  async updateCategorySpent(
    familyId: string,
    year: number,
    month: number,
    category: string,
    spent: number,
  ): Promise<void> {
    const budget = await this.budgetModel.findOne({ familyId, year, month });
    if (!budget) return;

    const categoryIndex = budget.categories.findIndex(
      (c) => c.category === category,
    );
    if (categoryIndex > -1) {
      budget.categories[categoryIndex].spent = spent;
      budget.totalSpent = budget.categories.reduce((sum, c) => sum + c.spent, 0);
      await budget.save();
    }
  }

  // 同步支出数据（批量）
  async syncSpentData(
    familyId: string,
    year: number,
    month: number,
    spentByCategory: { category: string; spent: number }[],
    totalSpent: number,
    totalIncome: number,
  ): Promise<BudgetDocument | null> {
    const budget = await this.budgetModel.findOne({ familyId, year, month });
    if (!budget) return null;

    for (const item of spentByCategory) {
      const categoryIndex = budget.categories.findIndex(
        (c) => c.category === item.category,
      );
      if (categoryIndex > -1) {
        budget.categories[categoryIndex].spent = item.spent;
      }
    }

    budget.totalSpent = totalSpent;
    budget.totalIncome = totalIncome;
    return budget.save();
  }

  // 添加储蓄目标
  async addSavingsGoal(
    familyId: string,
    year: number,
    month: number,
    goal: SavingsGoal,
    createdBy: string,
  ): Promise<BudgetDocument> {
    const budget = await this.getOrCreate(familyId, year, month, createdBy);
    budget.savingsGoals.push(goal as any);
    return budget.save();
  }

  // 更新储蓄目标进度
  async updateSavingsProgress(
    familyId: string,
    year: number,
    month: number,
    goalIndex: number,
    currentAmount: number,
  ): Promise<BudgetDocument> {
    const budget = await this.budgetModel.findOne({ familyId, year, month });
    if (!budget) {
      throw new NotFoundException('预算不存在');
    }

    if (goalIndex >= 0 && goalIndex < budget.savingsGoals.length) {
      budget.savingsGoals[goalIndex].currentAmount = currentAmount;
    }

    return budget.save();
  }

  // 删除储蓄目标
  async deleteSavingsGoal(
    familyId: string,
    year: number,
    month: number,
    goalIndex: number,
  ): Promise<BudgetDocument> {
    const budget = await this.budgetModel.findOne({ familyId, year, month });
    if (!budget) {
      throw new NotFoundException('预算不存在');
    }

    if (goalIndex >= 0 && goalIndex < budget.savingsGoals.length) {
      budget.savingsGoals.splice(goalIndex, 1);
    }

    return budget.save();
  }

  // 获取预算警告
  async getAlerts(
    familyId: string,
    year: number,
    month: number,
  ): Promise<{ category: string; percentage: number; isOver: boolean }[]> {
    const budget = await this.budgetModel.findOne({ familyId, year, month });
    if (!budget) return [];

    return budget.categories
      .filter((c) => c.budgetAmount > 0)
      .map((c) => {
        const percentage = (c.spent / c.budgetAmount) * 100;
        return {
          category: c.category,
          percentage: Math.round(percentage),
          isOver: percentage >= c.alertThreshold,
        };
      })
      .filter((alert) => alert.isOver);
  }

  // 获取年度统计
  async getYearlyStatistics(
    familyId: string,
    year: number,
  ): Promise<{
    months: { month: number; budget: number; spent: number; income: number }[];
    totalBudget: number;
    totalSpent: number;
    totalIncome: number;
    savingsRate: number;
  }> {
    const budgets = await this.budgetModel
      .find({ familyId, year })
      .sort({ month: 1 })
      .exec();

    const months = budgets.map((b) => ({
      month: b.month,
      budget: b.totalBudget,
      spent: b.totalSpent,
      income: b.totalIncome,
    }));

    const totalBudget = budgets.reduce((sum, b) => sum + b.totalBudget, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.totalSpent, 0);
    const totalIncome = budgets.reduce((sum, b) => sum + b.totalIncome, 0);
    const savingsRate = totalIncome > 0 
      ? Math.round(((totalIncome - totalSpent) / totalIncome) * 100) 
      : 0;

    return {
      months,
      totalBudget,
      totalSpent,
      totalIncome,
      savingsRate,
    };
  }

  // 锁定/解锁预算
  async toggleLock(
    familyId: string,
    year: number,
    month: number,
  ): Promise<BudgetDocument> {
    const budget = await this.budgetModel.findOne({ familyId, year, month });
    if (!budget) {
      throw new NotFoundException('预算不存在');
    }
    budget.isLocked = !budget.isLocked;
    return budget.save();
  }

  // 复制预算到下个月
  async copyToNextMonth(
    familyId: string,
    year: number,
    month: number,
    createdBy: string,
  ): Promise<BudgetDocument> {
    const source = await this.budgetModel.findOne({ familyId, year, month });
    if (!source) {
      throw new NotFoundException('源预算不存在');
    }

    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    const existing = await this.budgetModel.findOne({
      familyId,
      year: nextYear,
      month: nextMonth,
    });

    if (existing) {
      throw new ConflictException('目标月份预算已存在');
    }

    const newBudget = new this.budgetModel({
      familyId,
      year: nextYear,
      month: nextMonth,
      createdBy,
      categories: source.categories.map((c) => ({
        ...c,
        spent: 0,
      })),
      totalBudget: source.totalBudget,
      savingsGoals: source.savingsGoals,
    });

    return newBudget.save();
  }
}

