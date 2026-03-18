import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionType,
  SubscriptionStatus,
  BillingCycle,
} from './schemas/subscription.schema';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  // 创建订阅
  async create(
    familyId: string,
    createdBy: string,
    data: Partial<Subscription>,
  ): Promise<SubscriptionDocument> {
    const subscription = new this.subscriptionModel({
      ...data,
      familyId: new Types.ObjectId(familyId),
      createdBy: new Types.ObjectId(createdBy),
      managedBy: data.managedBy ? new Types.ObjectId(data.managedBy as any) : new Types.ObjectId(createdBy),
      sharedWith: data.sharedWith?.map((id) => new Types.ObjectId(id as any)) || [],
    });

    // 计算下次计费日期
    if (!subscription.nextBillingDate && subscription.startDate) {
      subscription.nextBillingDate = this.calculateNextBillingDate(
        subscription.startDate,
        subscription.billingCycle,
        subscription.customCycleDays,
      );
    }

    return subscription.save();
  }

  // 获取订阅列表
  async findByFamily(
    familyId: string,
    options: { status?: SubscriptionStatus; type?: SubscriptionType } = {},
  ): Promise<SubscriptionDocument[]> {
    const filter: any = { familyId: new Types.ObjectId(familyId) };
    if (options.status) filter.status = options.status;
    if (options.type) filter.type = options.type;

    return this.subscriptionModel
      .find(filter)
      .populate('managedBy', 'username avatar')
      .populate('sharedWith', 'username avatar')
      .sort({ nextBillingDate: 1 })
      .exec();
  }

  // 获取即将到期的订阅
  async getUpcomingRenewals(familyId: string, days = 7): Promise<SubscriptionDocument[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.subscriptionModel
      .find({
        familyId: new Types.ObjectId(familyId),
        status: SubscriptionStatus.ACTIVE,
        nextBillingDate: { $gte: now, $lte: futureDate },
      })
      .populate('managedBy', 'username avatar')
      .sort({ nextBillingDate: 1 })
      .exec();
  }

  // 获取单个订阅
  async findById(id: string): Promise<SubscriptionDocument> {
    const subscription = await this.subscriptionModel
      .findById(id)
      .populate('managedBy', 'username avatar')
      .populate('sharedWith', 'username avatar')
      .populate('createdBy', 'username avatar')
      .exec();

    if (!subscription) {
      throw new NotFoundException('订阅不存在');
    }

    return subscription;
  }

  // 更新订阅
  async update(id: string, data: Partial<Subscription>): Promise<SubscriptionDocument> {
    const updateData: any = { ...data };

    if (data.managedBy) {
      updateData.managedBy = new Types.ObjectId(data.managedBy as any);
    }
    if (data.sharedWith) {
      updateData.sharedWith = data.sharedWith.map((id) => new Types.ObjectId(id as any));
    }

    const subscription = await this.subscriptionModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!subscription) {
      throw new NotFoundException('订阅不存在');
    }

    return subscription;
  }

  // 删除订阅
  async delete(id: string): Promise<void> {
    const result = await this.subscriptionModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('订阅不存在');
    }
  }

  // 记录付款
  async recordPayment(
    id: string,
    payment: { amount: number; status: 'paid' | 'pending' | 'failed'; notes?: string },
  ): Promise<SubscriptionDocument> {
    const subscription = await this.subscriptionModel.findById(id);
    if (!subscription) {
      throw new NotFoundException('订阅不存在');
    }

    subscription.paymentHistory.push({
      date: new Date(),
      amount: payment.amount,
      status: payment.status,
      notes: payment.notes || '',
    });

    if (payment.status === 'paid') {
      subscription.lastBillingDate = new Date();
      subscription.nextBillingDate = this.calculateNextBillingDate(
        new Date(),
        subscription.billingCycle,
        subscription.customCycleDays,
      );
    }

    return subscription.save();
  }

  // 暂停订阅
  async pause(id: string): Promise<SubscriptionDocument> {
    return this.update(id, { status: SubscriptionStatus.PAUSED });
  }

  // 恢复订阅
  async resume(id: string): Promise<SubscriptionDocument> {
    const subscription = await this.subscriptionModel.findById(id);
    if (!subscription) {
      throw new NotFoundException('订阅不存在');
    }

    subscription.status = SubscriptionStatus.ACTIVE;
    // 如果下次计费日期已过，重新计算
    if (subscription.nextBillingDate < new Date()) {
      subscription.nextBillingDate = this.calculateNextBillingDate(
        new Date(),
        subscription.billingCycle,
        subscription.customCycleDays,
      );
    }

    return subscription.save();
  }

  // 取消订阅
  async cancel(id: string): Promise<SubscriptionDocument> {
    return this.update(id, { status: SubscriptionStatus.CANCELLED, endDate: new Date() });
  }

  // 获取统计信息
  async getStatistics(familyId: string): Promise<{
    totalActive: number;
    monthlyTotal: number;
    yearlyTotal: number;
    byType: { type: string; count: number; cost: number }[];
    upcomingThisWeek: number;
  }> {
    const familyObjId = new Types.ObjectId(familyId);

    const activeSubscriptions = await this.subscriptionModel.find({
      familyId: familyObjId,
      status: SubscriptionStatus.ACTIVE,
    });

    let monthlyTotal = 0;
    const typeStats = new Map<string, { count: number; cost: number }>();

    for (const sub of activeSubscriptions) {
      const monthlyCost = this.calculateMonthlyCost(sub);
      monthlyTotal += monthlyCost;

      const existing = typeStats.get(sub.type) || { count: 0, cost: 0 };
      existing.count++;
      existing.cost += monthlyCost;
      typeStats.set(sub.type, existing);
    }

    const upcomingRenewals = await this.getUpcomingRenewals(familyId, 7);

    return {
      totalActive: activeSubscriptions.length,
      monthlyTotal: Math.round(monthlyTotal * 100) / 100,
      yearlyTotal: Math.round(monthlyTotal * 12 * 100) / 100,
      byType: Array.from(typeStats.entries()).map(([type, data]) => ({
        type,
        count: data.count,
        cost: Math.round(data.cost * 100) / 100,
      })),
      upcomingThisWeek: upcomingRenewals.length,
    };
  }

  // 计算月均成本
  private calculateMonthlyCost(subscription: SubscriptionDocument): number {
    switch (subscription.billingCycle) {
      case BillingCycle.MONTHLY:
        return subscription.cost;
      case BillingCycle.QUARTERLY:
        return subscription.cost / 3;
      case BillingCycle.SEMI_ANNUALLY:
        return subscription.cost / 6;
      case BillingCycle.ANNUALLY:
        return subscription.cost / 12;
      case BillingCycle.CUSTOM:
        return subscription.customCycleDays
          ? (subscription.cost / subscription.customCycleDays) * 30
          : subscription.cost;
      default:
        return subscription.cost;
    }
  }

  // 计算下次计费日期
  private calculateNextBillingDate(
    fromDate: Date,
    cycle: BillingCycle,
    customDays?: number,
  ): Date {
    const date = new Date(fromDate);

    switch (cycle) {
      case BillingCycle.MONTHLY:
        date.setMonth(date.getMonth() + 1);
        break;
      case BillingCycle.QUARTERLY:
        date.setMonth(date.getMonth() + 3);
        break;
      case BillingCycle.SEMI_ANNUALLY:
        date.setMonth(date.getMonth() + 6);
        break;
      case BillingCycle.ANNUALLY:
        date.setFullYear(date.getFullYear() + 1);
        break;
      case BillingCycle.CUSTOM:
        date.setDate(date.getDate() + (customDays || 30));
        break;
    }

    return date;
  }
}
