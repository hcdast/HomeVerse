import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Moment, MomentDocument, MomentType } from './schemas/moment.schema';

@Injectable()
export class MomentsService {
  private readonly logger = new Logger(MomentsService.name);

  constructor(
    @InjectModel(Moment.name) private momentModel: Model<MomentDocument>,
  ) {}

  // 创建动态
  async create(createDto: Partial<Moment>): Promise<MomentDocument> {
    const moment = new this.momentModel(createDto);
    return moment.save();
  }

  // 获取家庭动态列表
  async findByFamily(
    familyId: string,
    options?: {
      type?: MomentType;
      limit?: number;
      skip?: number;
    },
  ): Promise<MomentDocument[]> {
    const query: any = { familyId, isVisible: true };

    if (options?.type) {
      query.type = options.type;
    }

    let queryBuilder = this.momentModel
      .find(query)
      .populate('author', 'username avatar')
      .populate('mentions', 'username avatar')
      .populate('comments.userId', 'username avatar')
      .populate('reactions.userId', 'username avatar')
      .sort({ isPinned: -1, createdAt: -1 });

    if (options?.skip) {
      queryBuilder = queryBuilder.skip(options.skip);
    }
    if (options?.limit) {
      queryBuilder = queryBuilder.limit(options.limit);
    }

    return queryBuilder.exec();
  }

  // 获取置顶公告
  async getPinnedAnnouncements(familyId: string): Promise<MomentDocument[]> {
    return this.momentModel
      .find({
        familyId,
        type: MomentType.ANNOUNCEMENT,
        isPinned: true,
        isVisible: true,
      })
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(5)
      .exec();
  }

  // 获取单个动态
  async findById(id: string): Promise<MomentDocument> {
    const moment = await this.momentModel
      .findById(id)
      .populate('author', 'username avatar')
      .populate('mentions', 'username avatar')
      .populate('comments.userId', 'username avatar')
      .populate('reactions.userId', 'username avatar')
      .exec();
    if (!moment) {
      throw new NotFoundException('动态不存在');
    }
    // 增加浏览次数
    moment.viewCount++;
    await moment.save();
    return moment;
  }

  // 添加表情回复
  async addReaction(
    id: string,
    userId: string,
    emoji: string,
  ): Promise<MomentDocument> {
    const moment = await this.momentModel.findById(id);
    if (!moment) {
      throw new NotFoundException('动态不存在');
    }

    // 检查是否已经反应过
    const existingIndex = moment.reactions.findIndex(
      (r) => r.userId.toString() === userId,
    );

    if (existingIndex > -1) {
      // 如果是同一个表情，则取消
      if (moment.reactions[existingIndex].emoji === emoji) {
        moment.reactions.splice(existingIndex, 1);
      } else {
        // 更换表情
        moment.reactions[existingIndex].emoji = emoji;
      }
    } else {
      // 添加新反应
      moment.reactions.push({ userId, emoji } as any);
    }

    return moment.save();
  }

  // 添加评论
  async addComment(
    id: string,
    userId: string,
    content: string,
  ): Promise<MomentDocument> {
    const moment = await this.momentModel.findById(id);
    if (!moment) {
      throw new NotFoundException('动态不存在');
    }

    moment.comments.push({
      userId,
      content,
      likes: [],
      createdAt: new Date(),
    } as any);

    return moment.save();
  }

  // 删除评论
  async deleteComment(
    momentId: string,
    commentIndex: number,
    userId: string,
  ): Promise<MomentDocument> {
    const moment = await this.momentModel.findById(momentId);
    if (!moment) {
      throw new NotFoundException('动态不存在');
    }

    if (commentIndex >= 0 && commentIndex < moment.comments.length) {
      const comment = moment.comments[commentIndex];
      if (comment.userId.toString() === userId) {
        moment.comments.splice(commentIndex, 1);
      }
    }

    return moment.save();
  }

  // 点赞评论
  async likeComment(
    momentId: string,
    commentIndex: number,
    userId: string,
  ): Promise<MomentDocument> {
    const moment = await this.momentModel.findById(momentId);
    if (!moment) {
      throw new NotFoundException('动态不存在');
    }

    if (commentIndex >= 0 && commentIndex < moment.comments.length) {
      const comment = moment.comments[commentIndex];
      const likeIndex = comment.likes.indexOf(userId);
      if (likeIndex > -1) {
        comment.likes.splice(likeIndex, 1);
      } else {
        comment.likes.push(userId);
      }
    }

    return moment.save();
  }

  // 切换置顶
  async togglePin(id: string): Promise<MomentDocument> {
    const moment = await this.momentModel.findById(id);
    if (!moment) {
      throw new NotFoundException('动态不存在');
    }
    moment.isPinned = !moment.isPinned;
    return moment.save();
  }

  // 更新动态
  async update(
    id: string,
    userId: string,
    updateDto: Partial<Moment>,
  ): Promise<MomentDocument> {
    const moment = await this.momentModel.findById(id);
    if (!moment) {
      throw new NotFoundException('动态不存在');
    }
    if (moment.author.toString() !== userId) {
      throw new Error('无权限修改');
    }

    Object.assign(moment, updateDto);
    return moment.save();
  }

  // 删除动态
  async delete(id: string, userId: string): Promise<void> {
    const moment = await this.momentModel.findById(id);
    if (!moment) {
      throw new NotFoundException('动态不存在');
    }
    // 可以检查权限
    await this.momentModel.findByIdAndDelete(id);
  }

  // 获取统计
  async getStatistics(familyId: string): Promise<{
    total: number;
    thisWeek: number;
    byType: { type: string; count: number }[];
    topContributors: { userId: string; username: string; count: number }[];
  }> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [total, thisWeek, byType, topContributors] = await Promise.all([
      this.momentModel.countDocuments({ familyId, isVisible: true }),
      this.momentModel.countDocuments({
        familyId,
        isVisible: true,
        createdAt: { $gte: weekAgo },
      }),
      this.momentModel.aggregate([
        { $match: { familyId, isVisible: true } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      this.momentModel.aggregate([
        { $match: { familyId, isVisible: true } },
        { $group: { _id: '$author', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            userId: '$_id',
            username: '$user.username',
            count: 1,
          },
        },
      ]),
    ]);

    return {
      total,
      thisWeek,
      byType: byType.map((item) => ({ type: item._id, count: item.count })),
      topContributors,
    };
  }
}

