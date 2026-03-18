import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Challenge,
  ChallengeDocument,
  ChallengeType,
  ChallengeStatus,
  ChallengeCategory,
} from './schemas/challenge.schema';

@Injectable()
export class ChallengesService {
  private readonly logger = new Logger(ChallengesService.name);

  constructor(@InjectModel(Challenge.name) private challengeModel: Model<ChallengeDocument>) {}

  // 创建挑战
  async create(
    familyId: string,
    createdBy: string,
    data: {
      title: string;
      description?: string;
      type: ChallengeType;
      category: ChallengeCategory;
      startDate: Date;
      endDate: Date;
      targetValue: number;
      unit?: string;
      participantIds?: string[];
      milestones?: any[];
      icon?: string;
      color?: string;
      coverImage?: string;
      tags?: string[];
      reward?: string;
      rewardPoints?: number;
      isTeamChallenge?: boolean;
      rules?: any;
    },
  ): Promise<ChallengeDocument> {
    if (data.startDate >= data.endDate) {
      throw new BadRequestException('开始日期必须早于结束日期');
    }

    const participants = (data.participantIds || []).map((id) => ({
      userId: new Types.ObjectId(id),
      currentProgress: 0,
      isCompleted: false,
      streakDays: 0,
      checkIns: [],
      points: 0,
    }));

    // 确保创建者也是参与者
    const creatorId = new Types.ObjectId(createdBy);
    if (!participants.some((p) => p.userId.equals(creatorId))) {
      participants.push({
        userId: creatorId,
        currentProgress: 0,
        isCompleted: false,
        streakDays: 0,
        checkIns: [],
        points: 0,
      });
    }

    const challenge = new this.challengeModel({
      ...data,
      familyId: new Types.ObjectId(familyId),
      createdBy: creatorId,
      participants,
      status: data.startDate <= new Date() ? ChallengeStatus.ACTIVE : ChallengeStatus.DRAFT,
    });

    return challenge.save();
  }

  // 获取挑战列表
  async findByFamily(
    familyId: string,
    options: { status?: ChallengeStatus; category?: ChallengeCategory; page?: number; limit?: number } = {},
  ): Promise<{ challenges: ChallengeDocument[]; total: number }> {
    const { status, category, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const filter: any = { familyId: new Types.ObjectId(familyId) };
    if (status) filter.status = status;
    if (category) filter.category = category;

    const [challenges, total] = await Promise.all([
      this.challengeModel
        .find(filter)
        .populate('createdBy', 'username avatar')
        .populate('participants.userId', 'username avatar')
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.challengeModel.countDocuments(filter),
    ]);

    return { challenges, total };
  }

  // 获取进行中的挑战
  async getActiveChallenges(familyId: string, userId: string): Promise<ChallengeDocument[]> {
    const userObjId = new Types.ObjectId(userId);

    return this.challengeModel
      .find({
        familyId: new Types.ObjectId(familyId),
        status: ChallengeStatus.ACTIVE,
        'participants.userId': userObjId,
      })
      .populate('createdBy', 'username avatar')
      .populate('participants.userId', 'username avatar')
      .sort({ endDate: 1 })
      .exec();
  }

  // 获取单个挑战
  async findById(id: string): Promise<ChallengeDocument> {
    const challenge = await this.challengeModel
      .findById(id)
      .populate('createdBy', 'username avatar')
      .populate('participants.userId', 'username avatar')
      .populate('encouragements.userId', 'username avatar')
      .exec();

    if (!challenge) {
      throw new NotFoundException('挑战不存在');
    }

    return challenge;
  }

  // 打卡/签到
  async checkIn(
    id: string,
    userId: string,
    data: { value: number; notes?: string; proofUrl?: string },
  ): Promise<ChallengeDocument> {
    const challenge = await this.challengeModel.findById(id);
    if (!challenge) {
      throw new NotFoundException('挑战不存在');
    }

    if (challenge.status !== ChallengeStatus.ACTIVE) {
      throw new BadRequestException('挑战未在进行中');
    }

    const userObjId = new Types.ObjectId(userId);
    const participant = challenge.participants.find((p) => p.userId.equals(userObjId));

    if (!participant) {
      throw new ForbiddenException('您不是该挑战的参与者');
    }

    // 检查今日是否已打卡
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCheckIn = participant.checkIns.find((c) => {
      const checkInDate = new Date(c.date);
      checkInDate.setHours(0, 0, 0, 0);
      return checkInDate.getTime() === today.getTime();
    });

    if (todayCheckIn) {
      // 更新今日打卡
      todayCheckIn.value += data.value;
      todayCheckIn.notes = data.notes || todayCheckIn.notes;
      if (data.proofUrl) todayCheckIn.proofUrl = data.proofUrl;
    } else {
      // 新增打卡
      participant.checkIns.push({
        date: new Date(),
        value: data.value,
        notes: data.notes || '',
        proofUrl: data.proofUrl || '',
      });

      // 更新连续天数
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const hasYesterdayCheckIn = participant.checkIns.some((c) => {
        const checkInDate = new Date(c.date);
        checkInDate.setHours(0, 0, 0, 0);
        return checkInDate.getTime() === yesterday.getTime();
      });

      if (hasYesterdayCheckIn) {
        participant.streakDays++;
      } else {
        participant.streakDays = 1;
      }
    }

    // 更新进度
    participant.currentProgress = participant.checkIns.reduce((sum, c) => sum + c.value, 0);

    // 检查是否完成
    if (participant.currentProgress >= challenge.targetValue && !participant.isCompleted) {
      participant.isCompleted = true;
      participant.completedAt = new Date();
      participant.points += challenge.rewardPoints;
    }

    // 更新团队进度
    if (challenge.isTeamChallenge) {
      challenge.teamProgress = challenge.participants.reduce((sum, p) => sum + p.currentProgress, 0);
    }

    // 检查里程碑
    for (const milestone of challenge.milestones) {
      if (participant.currentProgress >= milestone.targetValue) {
        participant.points += milestone.rewardPoints;
      }
    }

    return challenge.save();
  }

  // 加入挑战
  async join(id: string, userId: string): Promise<ChallengeDocument> {
    const challenge = await this.challengeModel.findById(id);
    if (!challenge) {
      throw new NotFoundException('挑战不存在');
    }

    if (challenge.status !== ChallengeStatus.ACTIVE) {
      throw new BadRequestException('挑战未在进行中');
    }

    const userObjId = new Types.ObjectId(userId);
    const isParticipant = challenge.participants.some((p) => p.userId.equals(userObjId));

    if (isParticipant) {
      throw new BadRequestException('您已经加入该挑战');
    }

    challenge.participants.push({
      userId: userObjId,
      currentProgress: 0,
      isCompleted: false,
      streakDays: 0,
      checkIns: [],
      points: 0,
    } as any);

    return challenge.save();
  }

  // 退出挑战
  async leave(id: string, userId: string): Promise<ChallengeDocument> {
    const challenge = await this.challengeModel.findById(id);
    if (!challenge) {
      throw new NotFoundException('挑战不存在');
    }

    const userObjId = new Types.ObjectId(userId);
    const participantIndex = challenge.participants.findIndex((p) => p.userId.equals(userObjId));

    if (participantIndex === -1) {
      throw new BadRequestException('您不是该挑战的参与者');
    }

    challenge.participants.splice(participantIndex, 1);

    return challenge.save();
  }

  // 发送鼓励
  async sendEncouragement(id: string, userId: string, message: string): Promise<ChallengeDocument> {
    const challenge = await this.challengeModel.findById(id);
    if (!challenge) {
      throw new NotFoundException('挑战不存在');
    }

    challenge.encouragements.push({
      userId: new Types.ObjectId(userId),
      message,
      createdAt: new Date(),
    });

    return challenge.save();
  }

  // 获取排行榜
  async getLeaderboard(id: string): Promise<{
    userId: Types.ObjectId;
    username: string;
    avatar: string;
    progress: number;
    streakDays: number;
    isCompleted: boolean;
    points: number;
  }[]> {
    const challenge = await this.challengeModel
      .findById(id)
      .populate('participants.userId', 'username avatar')
      .exec();

    if (!challenge) {
      throw new NotFoundException('挑战不存在');
    }

    return challenge.participants
      .map((p) => ({
        userId: p.userId,
        username: (p.userId as any).username,
        avatar: (p.userId as any).avatar,
        progress: p.currentProgress,
        streakDays: p.streakDays,
        isCompleted: p.isCompleted,
        points: p.points,
      }))
      .sort((a, b) => b.progress - a.progress);
  }

  // 取消挑战
  async cancel(id: string, userId: string): Promise<ChallengeDocument> {
    const challenge = await this.challengeModel.findById(id);
    if (!challenge) {
      throw new NotFoundException('挑战不存在');
    }

    if (challenge.createdBy.toString() !== userId) {
      throw new ForbiddenException('只有创建者可以取消挑战');
    }

    challenge.status = ChallengeStatus.CANCELLED;

    return challenge.save();
  }

  // 删除挑战
  async delete(id: string, userId: string): Promise<void> {
    const challenge = await this.challengeModel.findById(id);
    if (!challenge) {
      throw new NotFoundException('挑战不存在');
    }

    if (challenge.createdBy.toString() !== userId) {
      throw new ForbiddenException('只有创建者可以删除挑战');
    }

    await this.challengeModel.findByIdAndDelete(id);
  }

  // 获取统计信息
  async getStatistics(familyId: string, userId?: string): Promise<{
    totalChallenges: number;
    activeChallenges: number;
    completedChallenges: number;
    totalPoints: number;
    longestStreak: number;
    recentChallenges: ChallengeDocument[];
  }> {
    const familyObjId = new Types.ObjectId(familyId);

    const [total, active, completed, recentChallenges] = await Promise.all([
      this.challengeModel.countDocuments({ familyId: familyObjId }),
      this.challengeModel.countDocuments({ familyId: familyObjId, status: ChallengeStatus.ACTIVE }),
      this.challengeModel.countDocuments({ familyId: familyObjId, status: ChallengeStatus.COMPLETED }),
      this.challengeModel
        .find({ familyId: familyObjId })
        .populate('createdBy', 'username avatar')
        .sort({ createdAt: -1 })
        .limit(5)
        .exec(),
    ]);

    let totalPoints = 0;
    let longestStreak = 0;

    if (userId) {
      const userObjId = new Types.ObjectId(userId);
      const userChallenges = await this.challengeModel.find({
        familyId: familyObjId,
        'participants.userId': userObjId,
      });

      for (const challenge of userChallenges) {
        const participant = challenge.participants.find((p) => p.userId.equals(userObjId));
        if (participant) {
          totalPoints += participant.points;
          if (participant.streakDays > longestStreak) {
            longestStreak = participant.streakDays;
          }
        }
      }
    }

    return {
      totalChallenges: total,
      activeChallenges: active,
      completedChallenges: completed,
      totalPoints,
      longestStreak,
      recentChallenges,
    };
  }

  // 定时任务：更新挑战状态
  @Cron(CronExpression.EVERY_HOUR)
  async updateChallengeStatuses(): Promise<void> {
    const now = new Date();

    // 激活开始的挑战
    await this.challengeModel.updateMany(
      {
        status: ChallengeStatus.DRAFT,
        startDate: { $lte: now },
      },
      { $set: { status: ChallengeStatus.ACTIVE } },
    );

    // 结束到期的挑战
    const endedChallenges = await this.challengeModel.find({
      status: ChallengeStatus.ACTIVE,
      endDate: { $lt: now },
    });

    for (const challenge of endedChallenges) {
      // 检查是否完成
      const allCompleted = challenge.participants.every((p) => p.isCompleted);
      challenge.status = allCompleted ? ChallengeStatus.COMPLETED : ChallengeStatus.FAILED;
      await challenge.save();
    }
  }
}
