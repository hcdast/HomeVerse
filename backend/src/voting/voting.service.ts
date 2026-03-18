import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Vote, VoteDocument, VoteType, VoteStatus } from './schemas/voting.schema';

@Injectable()
export class VotingService {
  private readonly logger = new Logger(VotingService.name);

  constructor(@InjectModel(Vote.name) private voteModel: Model<VoteDocument>) {}

  // 创建投票
  async create(
    familyId: string,
    createdBy: string,
    data: {
      title: string;
      description?: string;
      type?: VoteType;
      options: { text: string; description?: string; image?: string }[];
      expiresAt?: Date;
      isAnonymous?: boolean;
      allowChangeVote?: boolean;
      maxSelections?: number;
      category?: string;
      tags?: string[];
      icon?: string;
    },
  ): Promise<VoteDocument> {
    if (!data.options || data.options.length < 2) {
      throw new BadRequestException('至少需要2个选项');
    }

    const vote = new this.voteModel({
      ...data,
      familyId: new Types.ObjectId(familyId),
      createdBy: new Types.ObjectId(createdBy),
      options: data.options.map((opt) => ({
        _id: new Types.ObjectId(),
        text: opt.text,
        description: opt.description,
        image: opt.image,
        voters: [],
        voteCount: 0,
      })),
    });

    return vote.save();
  }

  // 获取投票列表
  async findByFamily(
    familyId: string,
    options: { status?: VoteStatus; page?: number; limit?: number } = {},
  ): Promise<{ votes: VoteDocument[]; total: number }> {
    const { status, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const filter: any = { familyId: new Types.ObjectId(familyId) };
    if (status) filter.status = status;

    const [votes, total] = await Promise.all([
      this.voteModel
        .find(filter)
        .populate('createdBy', 'username avatar')
        .populate('options.voters', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.voteModel.countDocuments(filter),
    ]);

    return { votes, total };
  }

  // 获取进行中的投票
  async getActiveVotes(familyId: string): Promise<VoteDocument[]> {
    const now = new Date();

    return this.voteModel
      .find({
        familyId: new Types.ObjectId(familyId),
        status: VoteStatus.ACTIVE,
        $or: [{ expiresAt: { $gt: now } }, { expiresAt: { $exists: false } }, { expiresAt: null }],
      })
      .populate('createdBy', 'username avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  // 获取单个投票
  async findById(id: string): Promise<VoteDocument> {
    const vote = await this.voteModel
      .findById(id)
      .populate('createdBy', 'username avatar')
      .populate('options.voters', 'username avatar')
      .populate('participants', 'username avatar')
      .exec();

    if (!vote) {
      throw new NotFoundException('投票不存在');
    }

    // 检查是否过期
    if (vote.status === VoteStatus.ACTIVE && vote.expiresAt && vote.expiresAt < new Date()) {
      vote.status = VoteStatus.CLOSED;
      await this.calculateResult(vote);
      await vote.save();
    }

    return vote;
  }

  // 投票
  async castVote(id: string, userId: string, optionIds: string[]): Promise<VoteDocument> {
    const vote = await this.voteModel.findById(id);
    if (!vote) {
      throw new NotFoundException('投票不存在');
    }

    if (vote.status !== VoteStatus.ACTIVE) {
      throw new BadRequestException('投票已结束');
    }

    if (vote.expiresAt && vote.expiresAt < new Date()) {
      throw new BadRequestException('投票已过期');
    }

    const userObjId = new Types.ObjectId(userId);

    // 检查是否已投票
    const hasVoted = vote.participants.some((p) => p.equals(userObjId));
    if (hasVoted && !vote.allowChangeVote) {
      throw new BadRequestException('您已投票，不允许更改');
    }

    // 验证选项数量
    if (vote.type === VoteType.SINGLE && optionIds.length !== 1) {
      throw new BadRequestException('单选投票只能选择1个选项');
    }

    if (vote.type === VoteType.MULTIPLE && optionIds.length > vote.maxSelections) {
      throw new BadRequestException(`最多只能选择${vote.maxSelections}个选项`);
    }

    // 如果已投票，先清除之前的投票
    if (hasVoted) {
      for (const option of vote.options) {
        option.voters = option.voters.filter((v) => !v.equals(userObjId));
        option.voteCount = option.voters.length;
      }
    }

    // 添加新投票
    for (const optionId of optionIds) {
      const option = vote.options.find((o) => o._id.toString() === optionId);
      if (!option) {
        throw new BadRequestException('选项不存在');
      }

      if (!option.voters.some((v) => v.equals(userObjId))) {
        option.voters.push(userObjId);
        option.voteCount = option.voters.length;
      }
    }

    // 添加到参与者列表
    if (!hasVoted) {
      vote.participants.push(userObjId);
    }

    return vote.save();
  }

  // 撤回投票
  async withdrawVote(id: string, userId: string): Promise<VoteDocument> {
    const vote = await this.voteModel.findById(id);
    if (!vote) {
      throw new NotFoundException('投票不存在');
    }

    if (vote.status !== VoteStatus.ACTIVE) {
      throw new BadRequestException('投票已结束');
    }

    if (!vote.allowChangeVote) {
      throw new BadRequestException('此投票不允许撤回');
    }

    const userObjId = new Types.ObjectId(userId);

    // 从所有选项中移除投票
    for (const option of vote.options) {
      option.voters = option.voters.filter((v) => !v.equals(userObjId));
      option.voteCount = option.voters.length;
    }

    // 从参与者列表移除
    vote.participants = vote.participants.filter((p) => !p.equals(userObjId));

    return vote.save();
  }

  // 关闭投票
  async closeVote(id: string, userId: string): Promise<VoteDocument> {
    const vote = await this.voteModel.findById(id);
    if (!vote) {
      throw new NotFoundException('投票不存在');
    }

    if (vote.createdBy.toString() !== userId) {
      throw new ForbiddenException('只有创建者可以关闭投票');
    }

    vote.status = VoteStatus.CLOSED;
    await this.calculateResult(vote);

    return vote.save();
  }

  // 计算投票结果
  private async calculateResult(vote: VoteDocument): Promise<void> {
    const sortedOptions = [...vote.options].sort((a, b) => b.voteCount - a.voteCount);
    const winner = sortedOptions[0];
    const totalVotes = vote.options.reduce((sum, opt) => sum + opt.voteCount, 0);

    vote.result = {
      winnerId: winner._id,
      winnerText: winner.text,
      totalVotes,
      participationRate: vote.participants.length,
    };
  }

  // 删除投票
  async delete(id: string, userId: string): Promise<void> {
    const vote = await this.voteModel.findById(id);
    if (!vote) {
      throw new NotFoundException('投票不存在');
    }

    if (vote.createdBy.toString() !== userId) {
      throw new ForbiddenException('只有创建者可以删除投票');
    }

    await this.voteModel.findByIdAndDelete(id);
  }

  // 添加选项
  async addOption(
    id: string,
    userId: string,
    option: { text: string; description?: string; image?: string },
  ): Promise<VoteDocument> {
    const vote = await this.voteModel.findById(id);
    if (!vote) {
      throw new NotFoundException('投票不存在');
    }

    if (vote.status !== VoteStatus.ACTIVE) {
      throw new BadRequestException('投票已结束');
    }

    vote.options.push({
      _id: new Types.ObjectId(),
      text: option.text,
      description: option.description,
      image: option.image,
      voters: [],
      voteCount: 0,
    } as any);

    return vote.save();
  }

  // 获取统计信息
  async getStatistics(familyId: string): Promise<{
    total: number;
    active: number;
    closed: number;
    totalParticipation: number;
    recentVotes: VoteDocument[];
  }> {
    const familyObjId = new Types.ObjectId(familyId);

    const [total, active, closed, recentVotes] = await Promise.all([
      this.voteModel.countDocuments({ familyId: familyObjId }),
      this.voteModel.countDocuments({ familyId: familyObjId, status: VoteStatus.ACTIVE }),
      this.voteModel.countDocuments({ familyId: familyObjId, status: VoteStatus.CLOSED }),
      this.voteModel
        .find({ familyId: familyObjId })
        .populate('createdBy', 'username avatar')
        .sort({ createdAt: -1 })
        .limit(5)
        .exec(),
    ]);

    let totalParticipation = 0;
    for (const vote of recentVotes) {
      totalParticipation += vote.participants.length;
    }

    return { total, active, closed, totalParticipation, recentVotes };
  }
}
