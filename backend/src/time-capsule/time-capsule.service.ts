import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  TimeCapsule,
  TimeCapsuleDocument,
  CapsuleStatus,
  ContentType,
} from './schemas/time-capsule.schema';

@Injectable()
export class TimeCapsuleService {
  private readonly logger = new Logger(TimeCapsuleService.name);

  constructor(
    @InjectModel(TimeCapsule.name) private capsuleModel: Model<TimeCapsuleDocument>,
  ) {}

  // 创建时间胶囊
  async create(
    familyId: string,
    createdBy: string,
    data: {
      title: string;
      description?: string;
      openDate: Date;
      coverImage?: string;
      theme?: string;
      tags?: string[];
      isPublic?: boolean;
      allowLateContributions?: boolean;
      contributorIds?: string[];
      settings?: any;
    },
  ): Promise<TimeCapsuleDocument> {
    if (data.openDate <= new Date()) {
      throw new BadRequestException('开启日期必须是未来时间');
    }

    const contributors = data.contributorIds?.map((id) => ({
      userId: new Types.ObjectId(id),
      hasContributed: false,
      contentCount: 0,
    })) || [];

    // 确保创建者也是贡献者
    const creatorId = new Types.ObjectId(createdBy);
    if (!contributors.some((c) => c.userId.equals(creatorId))) {
      contributors.push({
        userId: creatorId,
        hasContributed: false,
        contentCount: 0,
      });
    }

    const capsule = new this.capsuleModel({
      ...data,
      familyId: new Types.ObjectId(familyId),
      createdBy: creatorId,
      contributors,
      status: CapsuleStatus.DRAFT,
    });

    return capsule.save();
  }

  // 获取胶囊列表
  async findByFamily(
    familyId: string,
    options: { status?: CapsuleStatus; page?: number; limit?: number } = {},
  ): Promise<{ capsules: TimeCapsuleDocument[]; total: number }> {
    const { status, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const filter: any = { familyId: new Types.ObjectId(familyId) };
    if (status) filter.status = status;

    const [capsules, total] = await Promise.all([
      this.capsuleModel
        .find(filter)
        .populate('createdBy', 'username avatar')
        .populate('contributors.userId', 'username avatar')
        .sort({ openDate: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.capsuleModel.countDocuments(filter),
    ]);

    return { capsules, total };
  }

  // 获取单个胶囊
  async findById(id: string, userId: string): Promise<TimeCapsuleDocument> {
    const capsule = await this.capsuleModel
      .findById(id)
      .populate('createdBy', 'username avatar')
      .populate('contributors.userId', 'username avatar')
      .populate('contents.addedBy', 'username avatar')
      .populate('reactions.userId', 'username avatar')
      .exec();

    if (!capsule) {
      throw new NotFoundException('时间胶囊不存在');
    }

    // 如果胶囊已封存但未开启，隐藏内容
    if (capsule.status === CapsuleStatus.SEALED) {
      const userObjId = new Types.ObjectId(userId);
      // 用户只能看到自己添加的内容
      capsule.contents = capsule.contents.filter(
        (c) => c.addedBy && (c.addedBy as any)._id?.equals(userObjId),
      );
    }

    return capsule;
  }

  // 封存胶囊
  async seal(id: string, userId: string): Promise<TimeCapsuleDocument> {
    const capsule = await this.capsuleModel.findById(id);
    if (!capsule) {
      throw new NotFoundException('时间胶囊不存在');
    }

    if (capsule.createdBy.toString() !== userId) {
      throw new ForbiddenException('只有创建者可以封存胶囊');
    }

    if (capsule.status !== CapsuleStatus.DRAFT) {
      throw new BadRequestException('只有草稿状态的胶囊可以封存');
    }

    if (capsule.contents.length === 0) {
      throw new BadRequestException('胶囊中至少需要一个内容才能封存');
    }

    capsule.status = CapsuleStatus.SEALED;
    capsule.sealedAt = new Date();

    return capsule.save();
  }

  // 添加内容
  async addContent(
    id: string,
    userId: string,
    content: {
      type: ContentType;
      text?: string;
      fileUrl?: string;
      fileName?: string;
      thumbnail?: string;
    },
  ): Promise<TimeCapsuleDocument> {
    const capsule = await this.capsuleModel.findById(id);
    if (!capsule) {
      throw new NotFoundException('时间胶囊不存在');
    }

    // 检查状态
    if (capsule.status === CapsuleStatus.OPENED) {
      throw new BadRequestException('胶囊已开启，无法添加内容');
    }

    if (capsule.status === CapsuleStatus.SEALED && !capsule.allowLateContributions) {
      throw new BadRequestException('胶囊已封存，不允许添加内容');
    }

    const userObjId = new Types.ObjectId(userId);

    // 检查是否是贡献者
    const contributor = capsule.contributors.find((c) => c.userId.equals(userObjId));
    if (!contributor && !capsule.isPublic) {
      throw new ForbiddenException('您不是该胶囊的贡献者');
    }

    // 检查内容数量限制
    if (capsule.settings?.maxContentsPerUser) {
      const userContentCount = capsule.contents.filter(
        (c) => c.addedBy && c.addedBy.equals(userObjId),
      ).length;
      if (userContentCount >= capsule.settings.maxContentsPerUser) {
        throw new BadRequestException(`每人最多添加${capsule.settings.maxContentsPerUser}个内容`);
      }
    }

    // 添加内容
    capsule.contents.push({
      _id: new Types.ObjectId(),
      ...content,
      addedBy: userObjId,
      addedAt: new Date(),
    } as any);

    // 更新贡献者状态
    if (contributor) {
      contributor.hasContributed = true;
      contributor.contributedAt = new Date();
      contributor.contentCount++;
    }

    return capsule.save();
  }

  // 删除内容
  async removeContent(id: string, contentId: string, userId: string): Promise<TimeCapsuleDocument> {
    const capsule = await this.capsuleModel.findById(id);
    if (!capsule) {
      throw new NotFoundException('时间胶囊不存在');
    }

    if (capsule.status !== CapsuleStatus.DRAFT) {
      throw new BadRequestException('只有草稿状态的胶囊可以删除内容');
    }

    const contentIndex = capsule.contents.findIndex(
      (c) => c._id.toString() === contentId,
    );
    if (contentIndex === -1) {
      throw new NotFoundException('内容不存在');
    }

    const content = capsule.contents[contentIndex];
    const isOwner = content.addedBy && content.addedBy.toString() === userId;
    const isCreator = capsule.createdBy.toString() === userId;

    if (!isOwner && !isCreator) {
      throw new ForbiddenException('只能删除自己添加的内容');
    }

    capsule.contents.splice(contentIndex, 1);

    return capsule.save();
  }

  // 手动开启胶囊
  async open(id: string, userId: string): Promise<TimeCapsuleDocument> {
    const capsule = await this.capsuleModel.findById(id);
    if (!capsule) {
      throw new NotFoundException('时间胶囊不存在');
    }

    if (capsule.status !== CapsuleStatus.SEALED) {
      throw new BadRequestException('只有已封存的胶囊可以开启');
    }

    if (capsule.openDate > new Date()) {
      // 只有创建者可以提前开启
      if (capsule.createdBy.toString() !== userId) {
        throw new ForbiddenException('只有创建者可以提前开启胶囊');
      }
    }

    capsule.status = CapsuleStatus.OPENED;
    capsule.openedAt = new Date();

    return capsule.save();
  }

  // 添加反应/评论
  async addReaction(
    id: string,
    userId: string,
    reaction: { emotion: string; comment?: string },
  ): Promise<TimeCapsuleDocument> {
    const capsule = await this.capsuleModel.findById(id);
    if (!capsule) {
      throw new NotFoundException('时间胶囊不存在');
    }

    if (capsule.status !== CapsuleStatus.OPENED) {
      throw new BadRequestException('只有已开启的胶囊可以添加反应');
    }

    capsule.reactions.push({
      userId: new Types.ObjectId(userId),
      emotion: reaction.emotion,
      comment: reaction.comment || '',
      createdAt: new Date(),
    });

    return capsule.save();
  }

  // 邀请贡献者
  async inviteContributors(id: string, userId: string, contributorIds: string[]): Promise<TimeCapsuleDocument> {
    const capsule = await this.capsuleModel.findById(id);
    if (!capsule) {
      throw new NotFoundException('时间胶囊不存在');
    }

    if (capsule.createdBy.toString() !== userId) {
      throw new ForbiddenException('只有创建者可以邀请贡献者');
    }

    for (const contribId of contributorIds) {
      const contribObjId = new Types.ObjectId(contribId);
      if (!capsule.contributors.some((c) => c.userId.equals(contribObjId))) {
        capsule.contributors.push({
          userId: contribObjId,
          hasContributed: false,
          contentCount: 0,
        } as any);
      }
    }

    return capsule.save();
  }

  // 删除胶囊
  async delete(id: string, userId: string): Promise<void> {
    const capsule = await this.capsuleModel.findById(id);
    if (!capsule) {
      throw new NotFoundException('时间胶囊不存在');
    }

    if (capsule.createdBy.toString() !== userId) {
      throw new ForbiddenException('只有创建者可以删除胶囊');
    }

    if (capsule.status === CapsuleStatus.OPENED) {
      throw new BadRequestException('已开启的胶囊不能删除');
    }

    await this.capsuleModel.findByIdAndDelete(id);
  }

  // 获取统计信息
  async getStatistics(familyId: string): Promise<{
    total: number;
    sealed: number;
    opened: number;
    pending: number;
    nextToOpen: TimeCapsuleDocument | null;
  }> {
    const familyObjId = new Types.ObjectId(familyId);
    const now = new Date();

    const [total, sealed, opened, nextToOpen] = await Promise.all([
      this.capsuleModel.countDocuments({ familyId: familyObjId }),
      this.capsuleModel.countDocuments({ familyId: familyObjId, status: CapsuleStatus.SEALED }),
      this.capsuleModel.countDocuments({ familyId: familyObjId, status: CapsuleStatus.OPENED }),
      this.capsuleModel
        .findOne({
          familyId: familyObjId,
          status: CapsuleStatus.SEALED,
          openDate: { $gte: now },
        })
        .sort({ openDate: 1 })
        .populate('createdBy', 'username avatar')
        .exec(),
    ]);

    return {
      total,
      sealed,
      opened,
      pending: sealed, // 等待开启的数量
      nextToOpen,
    };
  }

  // 定时任务：自动开启到期的胶囊
  @Cron(CronExpression.EVERY_HOUR)
  async autoOpenCapsules(): Promise<void> {
    const now = new Date();

    const capsuesToOpen = await this.capsuleModel.find({
      status: CapsuleStatus.SEALED,
      openDate: { $lte: now },
    });

    for (const capsule of capsuesToOpen) {
      capsule.status = CapsuleStatus.OPENED;
      capsule.openedAt = now;
      await capsule.save();

      this.logger.log(`自动开启时间胶囊: ${capsule.title}`);
      // TODO: 发送通知
    }
  }
}
