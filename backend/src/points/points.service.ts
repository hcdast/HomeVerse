import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Point,
  PointDocument,
  PointBalance,
  PointBalanceDocument,
  Reward,
  RewardDocument,
  Redemption,
  RedemptionDocument,
  PointSource,
  PointTransactionType,
} from './schemas/point.schema';

// 等级配置
const LEVELS = [
  { level: 1, minPoints: 0, title: '新手' },
  { level: 2, minPoints: 100, title: '见习' },
  { level: 3, minPoints: 300, title: '能手' },
  { level: 4, minPoints: 600, title: '达人' },
  { level: 5, minPoints: 1000, title: '专家' },
  { level: 6, minPoints: 1500, title: '大师' },
  { level: 7, minPoints: 2500, title: '宗师' },
  { level: 8, minPoints: 4000, title: '传奇' },
  { level: 9, minPoints: 6000, title: '神话' },
  { level: 10, minPoints: 10000, title: '至尊' },
];

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(
    @InjectModel(Point.name) private pointModel: Model<PointDocument>,
    @InjectModel(PointBalance.name) private balanceModel: Model<PointBalanceDocument>,
    @InjectModel(Reward.name) private rewardModel: Model<RewardDocument>,
    @InjectModel(Redemption.name) private redemptionModel: Model<RedemptionDocument>,
  ) {}

  // ============= 积分操作 =============

  // 添加积分（家务、待办完成等）
  async earnPoints(
    userId: string,
    familyId: string,
    amount: number,
    source: PointSource,
    description: string,
    metadata?: { relatedId?: string; relatedType?: string },
    createdBy?: string,
  ): Promise<PointDocument> {
    if (amount <= 0) {
      throw new BadRequestException('积分数量必须大于0');
    }

    // 获取或创建余额记录
    let balance = await this.getOrCreateBalance(userId, familyId);

    // 更新余额
    const newBalance = balance.balance + amount;
    balance.balance = newBalance;
    balance.totalEarned += amount;
    balance.lastEarnedAt = new Date();

    // 更新等级
    const levelInfo = this.calculateLevel(balance.totalEarned);
    balance.level = levelInfo.level;
    balance.title = levelInfo.title;

    await balance.save();

    // 创建积分记录
    const point = new this.pointModel({
      userId: new Types.ObjectId(userId),
      familyId: new Types.ObjectId(familyId),
      type: PointTransactionType.EARN,
      source,
      amount,
      balance: newBalance,
      description,
      metadata,
      createdBy: createdBy ? new Types.ObjectId(createdBy) : new Types.ObjectId(userId),
    });

    return point.save();
  }

  // 扣除积分（兑换奖励等）
  async spendPoints(
    userId: string,
    familyId: string,
    amount: number,
    source: PointSource,
    description: string,
    metadata?: { rewardId?: string },
  ): Promise<PointDocument> {
    if (amount <= 0) {
      throw new BadRequestException('积分数量必须大于0');
    }

    const balance = await this.balanceModel.findOne({
      userId: new Types.ObjectId(userId),
      familyId: new Types.ObjectId(familyId),
    });

    if (!balance || balance.balance < amount) {
      throw new BadRequestException('积分不足');
    }

    const newBalance = balance.balance - amount;
    balance.balance = newBalance;
    balance.totalSpent += amount;
    await balance.save();

    const point = new this.pointModel({
      userId: new Types.ObjectId(userId),
      familyId: new Types.ObjectId(familyId),
      type: PointTransactionType.SPEND,
      source,
      amount: -amount,
      balance: newBalance,
      description,
      metadata,
    });

    return point.save();
  }

  // 积分转账
  async transferPoints(
    fromUserId: string,
    toUserId: string,
    familyId: string,
    amount: number,
    description?: string,
  ): Promise<{ from: PointDocument; to: PointDocument }> {
    if (amount <= 0) {
      throw new BadRequestException('转账积分必须大于0');
    }

    if (fromUserId === toUserId) {
      throw new BadRequestException('不能给自己转账');
    }

    // 扣除发送方积分
    const fromPoint = await this.spendPoints(
      fromUserId,
      familyId,
      amount,
      PointSource.TRANSFER_OUT,
      description || `转账给其他成员`,
      { rewardId: toUserId },
    );

    // 增加接收方积分
    const toPoint = await this.earnPoints(
      toUserId,
      familyId,
      amount,
      PointSource.TRANSFER_IN,
      description || `收到其他成员转账`,
      { relatedId: fromUserId, relatedType: 'transfer' },
      fromUserId,
    );

    return { from: fromPoint, to: toPoint };
  }

  // 发放奖励积分（管理员）
  async grantBonusPoints(
    userId: string,
    familyId: string,
    amount: number,
    description: string,
    grantedBy: string,
  ): Promise<PointDocument> {
    return this.earnPoints(
      userId,
      familyId,
      amount,
      PointSource.BONUS,
      description,
      { relatedId: grantedBy, relatedType: 'bonus' },
      grantedBy,
    );
  }

  // 惩罚扣除积分（管理员）
  async penaltyPoints(
    userId: string,
    familyId: string,
    amount: number,
    description: string,
  ): Promise<PointDocument> {
    return this.spendPoints(userId, familyId, amount, PointSource.PENALTY, description);
  }

  // ============= 余额查询 =============

  // 获取用户积分余额
  async getBalance(userId: string, familyId: string): Promise<PointBalanceDocument> {
    return this.getOrCreateBalance(userId, familyId);
  }

  // 获取家庭所有成员积分排行
  async getFamilyLeaderboard(familyId: string): Promise<PointBalanceDocument[]> {
    return this.balanceModel
      .find({ familyId: new Types.ObjectId(familyId) })
      .populate('userId', 'username avatar')
      .sort({ balance: -1 })
      .exec();
  }

  // 获取用户积分历史
  async getPointHistory(
    userId: string,
    familyId: string,
    options: { page?: number; limit?: number; type?: PointTransactionType } = {},
  ): Promise<{ records: PointDocument[]; total: number }> {
    const { page = 1, limit = 20, type } = options;
    const skip = (page - 1) * limit;

    const filter: any = {
      userId: new Types.ObjectId(userId),
      familyId: new Types.ObjectId(familyId),
    };
    if (type) filter.type = type;

    const [records, total] = await Promise.all([
      this.pointModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.pointModel.countDocuments(filter),
    ]);

    return { records, total };
  }

  // ============= 奖励管理 =============

  // 创建奖励
  async createReward(
    familyId: string,
    data: Partial<Reward>,
    createdBy: string,
  ): Promise<RewardDocument> {
    const reward = new this.rewardModel({
      ...data,
      familyId: new Types.ObjectId(familyId),
      createdBy: new Types.ObjectId(createdBy),
    });
    return reward.save();
  }

  // 获取家庭奖励列表
  async getRewards(familyId: string, activeOnly = true): Promise<RewardDocument[]> {
    const filter: any = { familyId: new Types.ObjectId(familyId) };
    if (activeOnly) filter.isActive = true;

    return this.rewardModel.find(filter).sort({ cost: 1 }).exec();
  }

  // 更新奖励
  async updateReward(rewardId: string, data: Partial<Reward>): Promise<RewardDocument> {
    const reward = await this.rewardModel.findByIdAndUpdate(rewardId, data, { new: true });
    if (!reward) {
      throw new NotFoundException('奖励不存在');
    }
    return reward;
  }

  // 删除奖励
  async deleteReward(rewardId: string): Promise<void> {
    const result = await this.rewardModel.findByIdAndDelete(rewardId);
    if (!result) {
      throw new NotFoundException('奖励不存在');
    }
  }

  // ============= 兑换操作 =============

  // 兑换奖励
  async redeemReward(userId: string, familyId: string, rewardId: string): Promise<RedemptionDocument> {
    const reward = await this.rewardModel.findById(rewardId);
    if (!reward) {
      throw new NotFoundException('奖励不存在');
    }

    if (!reward.isActive) {
      throw new BadRequestException('该奖励已下架');
    }

    if (reward.stock === 0) {
      throw new BadRequestException('该奖励已售罄');
    }

    // 扣除积分
    await this.spendPoints(
      userId,
      familyId,
      reward.cost,
      PointSource.REDEEM,
      `兑换奖励: ${reward.name}`,
      { rewardId },
    );

    // 更新库存
    if (reward.stock > 0) {
      reward.stock -= 1;
    }
    reward.redeemCount += 1;
    await reward.save();

    // 创建兑换记录
    const redemption = new this.redemptionModel({
      userId: new Types.ObjectId(userId),
      familyId: new Types.ObjectId(familyId),
      rewardId: new Types.ObjectId(rewardId),
      rewardName: reward.name,
      cost: reward.cost,
      status: 'pending',
    });

    return redemption.save();
  }

  // 获取用户兑换记录
  async getRedemptions(
    userId: string,
    familyId: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<{ records: RedemptionDocument[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const filter = {
      userId: new Types.ObjectId(userId),
      familyId: new Types.ObjectId(familyId),
    };

    const [records, total] = await Promise.all([
      this.redemptionModel
        .find(filter)
        .populate('rewardId', 'name icon')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.redemptionModel.countDocuments(filter),
    ]);

    return { records, total };
  }

  // 处理兑换申请（管理员）
  async processRedemption(
    redemptionId: string,
    status: 'approved' | 'rejected' | 'completed',
    processedBy: string,
    notes?: string,
  ): Promise<RedemptionDocument> {
    const redemption = await this.redemptionModel.findById(redemptionId);
    if (!redemption) {
      throw new NotFoundException('兑换记录不存在');
    }

    // 如果拒绝，退还积分
    if (status === 'rejected' && redemption.status === 'pending') {
      await this.earnPoints(
        redemption.userId.toString(),
        redemption.familyId.toString(),
        redemption.cost,
        PointSource.REWARD,
        `兑换被拒绝，退还积分: ${redemption.rewardName}`,
        { relatedId: redemptionId, relatedType: 'refund' },
        processedBy,
      );
    }

    redemption.status = status;
    redemption.processedBy = new Types.ObjectId(processedBy);
    redemption.processedAt = new Date();
    if (notes) redemption.notes = notes;

    return redemption.save();
  }

  // ============= 统计分析 =============

  // 获取积分统计
  async getStatistics(familyId: string): Promise<{
    totalEarned: number;
    totalSpent: number;
    activeMembers: number;
    topEarners: any[];
    recentActivity: PointDocument[];
    bySource: { source: string; amount: number }[];
  }> {
    const familyObjId = new Types.ObjectId(familyId);

    const [balances, recentActivity, bySource] = await Promise.all([
      this.balanceModel
        .find({ familyId: familyObjId })
        .populate('userId', 'username avatar')
        .sort({ totalEarned: -1 })
        .limit(10)
        .exec(),
      this.pointModel
        .find({ familyId: familyObjId })
        .populate('userId', 'username avatar')
        .sort({ createdAt: -1 })
        .limit(10)
        .exec(),
      this.pointModel.aggregate([
        { $match: { familyId: familyObjId, type: PointTransactionType.EARN } },
        { $group: { _id: '$source', amount: { $sum: '$amount' } } },
      ]),
    ]);

    const totalEarned = balances.reduce((sum, b) => sum + b.totalEarned, 0);
    const totalSpent = balances.reduce((sum, b) => sum + b.totalSpent, 0);

    return {
      totalEarned,
      totalSpent,
      activeMembers: balances.length,
      topEarners: balances.slice(0, 5).map((b) => ({
        user: b.userId,
        totalEarned: b.totalEarned,
        balance: b.balance,
        level: b.level,
        title: b.title,
      })),
      recentActivity,
      bySource: bySource.map((item) => ({
        source: item._id,
        amount: item.amount,
      })),
    };
  }

  // ============= 辅助方法 =============

  private async getOrCreateBalance(userId: string, familyId: string): Promise<PointBalanceDocument> {
    let balance = await this.balanceModel.findOne({
      userId: new Types.ObjectId(userId),
      familyId: new Types.ObjectId(familyId),
    });

    if (!balance) {
      balance = new this.balanceModel({
        userId: new Types.ObjectId(userId),
        familyId: new Types.ObjectId(familyId),
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        level: 1,
        title: '新手',
      });
      await balance.save();
    }

    return balance;
  }

  private calculateLevel(totalEarned: number): { level: number; title: string } {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (totalEarned >= LEVELS[i].minPoints) {
        return LEVELS[i];
      }
    }
    return LEVELS[0];
  }

  // 获取等级配置
  getLevelConfig(): typeof LEVELS {
    return LEVELS;
  }
}
