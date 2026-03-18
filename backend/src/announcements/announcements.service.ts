import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Announcement,
  AnnouncementDocument,
  AnnouncementPriority,
  AnnouncementStatus,
} from './schemas/announcement.schema';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    @InjectModel(Announcement.name) private announcementModel: Model<AnnouncementDocument>,
  ) {}

  // 创建公告
  async create(
    familyId: string,
    createdBy: string,
    data: {
      title: string;
      content: string;
      priority?: AnnouncementPriority;
      isPinned?: boolean;
      mentions?: string[];
      requireConfirmation?: boolean;
      expiresAt?: Date;
      attachments?: string[];
      tags?: string[];
      icon?: string;
      schedule?: { publishAt?: Date; unpublishAt?: Date };
    },
  ): Promise<AnnouncementDocument> {
    const announcement = new this.announcementModel({
      ...data,
      familyId: new Types.ObjectId(familyId),
      createdBy: new Types.ObjectId(createdBy),
      mentions: data.mentions?.map((id) => new Types.ObjectId(id)) || [],
      status: data.schedule?.publishAt && data.schedule.publishAt > new Date()
        ? AnnouncementStatus.DRAFT
        : AnnouncementStatus.PUBLISHED,
    });

    return announcement.save();
  }

  // 获取家庭公告列表
  async findByFamily(
    familyId: string,
    options: {
      page?: number;
      limit?: number;
      status?: AnnouncementStatus;
      priority?: AnnouncementPriority;
      includeDrafts?: boolean;
    } = {},
  ): Promise<{ announcements: AnnouncementDocument[]; total: number }> {
    const { page = 1, limit = 20, status, priority, includeDrafts = false } = options;
    const skip = (page - 1) * limit;

    const filter: any = { familyId: new Types.ObjectId(familyId) };

    if (status) {
      filter.status = status;
    } else if (!includeDrafts) {
      filter.status = AnnouncementStatus.PUBLISHED;
    }

    if (priority) {
      filter.priority = priority;
    }

    // 排除已过期的公告
    filter.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ];

    const [announcements, total] = await Promise.all([
      this.announcementModel
        .find(filter)
        .populate('createdBy', 'username avatar')
        .populate('mentions', 'username avatar')
        .populate('comments.userId', 'username avatar')
        .sort({ isPinned: -1, priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.announcementModel.countDocuments(filter),
    ]);

    return { announcements, total };
  }

  // 获取置顶公告
  async getPinnedAnnouncements(familyId: string): Promise<AnnouncementDocument[]> {
    return this.announcementModel
      .find({
        familyId: new Types.ObjectId(familyId),
        status: AnnouncementStatus.PUBLISHED,
        isPinned: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } },
        ],
      })
      .populate('createdBy', 'username avatar')
      .sort({ priority: -1, createdAt: -1 })
      .limit(5)
      .exec();
  }

  // 获取@我的公告
  async getMentionedAnnouncements(
    familyId: string,
    userId: string,
  ): Promise<AnnouncementDocument[]> {
    return this.announcementModel
      .find({
        familyId: new Types.ObjectId(familyId),
        status: AnnouncementStatus.PUBLISHED,
        mentions: new Types.ObjectId(userId),
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } },
        ],
      })
      .populate('createdBy', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(10)
      .exec();
  }

  // 获取未读公告数量
  async getUnreadCount(familyId: string, userId: string): Promise<number> {
    return this.announcementModel.countDocuments({
      familyId: new Types.ObjectId(familyId),
      status: AnnouncementStatus.PUBLISHED,
      readBy: { $ne: new Types.ObjectId(userId) },
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    });
  }

  // 获取待确认公告
  async getPendingConfirmations(familyId: string, userId: string): Promise<AnnouncementDocument[]> {
    return this.announcementModel
      .find({
        familyId: new Types.ObjectId(familyId),
        status: AnnouncementStatus.PUBLISHED,
        requireConfirmation: true,
        confirmedBy: { $ne: new Types.ObjectId(userId) },
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } },
        ],
      })
      .populate('createdBy', 'username avatar')
      .sort({ priority: -1, createdAt: -1 })
      .exec();
  }

  // 获取单个公告
  async findById(id: string): Promise<AnnouncementDocument> {
    const announcement = await this.announcementModel
      .findById(id)
      .populate('createdBy', 'username avatar')
      .populate('mentions', 'username avatar')
      .populate('readBy', 'username avatar')
      .populate('confirmedBy', 'username avatar')
      .populate('comments.userId', 'username avatar')
      .exec();

    if (!announcement) {
      throw new NotFoundException('公告不存在');
    }

    return announcement;
  }

  // 更新公告
  async update(
    id: string,
    userId: string,
    data: Partial<{
      title: string;
      content: string;
      priority: AnnouncementPriority;
      isPinned: boolean;
      mentions: string[];
      requireConfirmation: boolean;
      expiresAt: Date;
      attachments: string[];
      tags: string[];
      icon: string;
      status: AnnouncementStatus;
    }>,
  ): Promise<AnnouncementDocument> {
    const announcement = await this.announcementModel.findById(id);
    if (!announcement) {
      throw new NotFoundException('公告不存在');
    }

    // 检查权限（只有创建者可以编辑）
    if (announcement.createdBy.toString() !== userId) {
      throw new ForbiddenException('无权编辑此公告');
    }

    const updateData: any = { ...data };
    if (data.mentions) {
      updateData.mentions = data.mentions.map((mid) => new Types.ObjectId(mid));
    }

    return this.announcementModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  // 删除公告
  async delete(id: string, userId: string): Promise<void> {
    const announcement = await this.announcementModel.findById(id);
    if (!announcement) {
      throw new NotFoundException('公告不存在');
    }

    // 检查权限
    if (announcement.createdBy.toString() !== userId) {
      throw new ForbiddenException('无权删除此公告');
    }

    await this.announcementModel.findByIdAndDelete(id);
  }

  // 标记为已读
  async markAsRead(id: string, userId: string): Promise<AnnouncementDocument> {
    const announcement = await this.announcementModel.findById(id);
    if (!announcement) {
      throw new NotFoundException('公告不存在');
    }

    const userObjId = new Types.ObjectId(userId);
    if (!announcement.readBy.some((uid) => uid.equals(userObjId))) {
      announcement.readBy.push(userObjId);
      await announcement.save();
    }

    return announcement;
  }

  // 确认公告
  async confirmAnnouncement(id: string, userId: string): Promise<AnnouncementDocument> {
    const announcement = await this.announcementModel.findById(id);
    if (!announcement) {
      throw new NotFoundException('公告不存在');
    }

    if (!announcement.requireConfirmation) {
      throw new ForbiddenException('此公告不需要确认');
    }

    const userObjId = new Types.ObjectId(userId);
    if (!announcement.confirmedBy.some((uid) => uid.equals(userObjId))) {
      announcement.confirmedBy.push(userObjId);
      // 确认时也标记为已读
      if (!announcement.readBy.some((uid) => uid.equals(userObjId))) {
        announcement.readBy.push(userObjId);
      }
      await announcement.save();
    }

    // 重新获取并 populate 用户信息
    return this.findById(id);
  }

  // 添加评论
  async addComment(id: string, userId: string, content: string): Promise<AnnouncementDocument> {
    const announcement = await this.announcementModel.findById(id);
    if (!announcement) {
      throw new NotFoundException('公告不存在');
    }

    announcement.comments.push({
      _id: new Types.ObjectId(),
      userId: new Types.ObjectId(userId),
      content,
      createdAt: new Date(),
    });

    await announcement.save();

    // 重新获取并 populate 用户信息
    return this.findById(id);
  }

  // 删除评论
  async deleteComment(id: string, commentId: string, userId: string): Promise<AnnouncementDocument> {
    const announcement = await this.announcementModel.findById(id);
    if (!announcement) {
      throw new NotFoundException('公告不存在');
    }

    const commentIndex = announcement.comments.findIndex(
      (c) => c._id.toString() === commentId && c.userId.toString() === userId,
    );

    if (commentIndex === -1) {
      throw new ForbiddenException('评论不存在或无权删除');
    }

    announcement.comments.splice(commentIndex, 1);
    await announcement.save();

    // 重新获取并 populate 用户信息
    return this.findById(id);
  }

  // 添加表情反应
  async addReaction(id: string, userId: string, emoji: string): Promise<AnnouncementDocument> {
    const announcement = await this.announcementModel.findById(id);
    if (!announcement) {
      throw new NotFoundException('公告不存在');
    }

    const userObjId = new Types.ObjectId(userId);
    const reaction = announcement.reactions.find((r) => r.emoji === emoji);

    if (reaction) {
      if (!reaction.users.some((uid) => uid.equals(userObjId))) {
        reaction.users.push(userObjId);
      }
    } else {
      announcement.reactions.push({ emoji, users: [userObjId] });
    }

    await announcement.save();

    // 重新获取并 populate 用户信息
    return this.findById(id);
  }

  // 移除表情反应
  async removeReaction(id: string, userId: string, emoji: string): Promise<AnnouncementDocument> {
    const announcement = await this.announcementModel.findById(id);
    if (!announcement) {
      throw new NotFoundException('公告不存在');
    }

    const reaction = announcement.reactions.find((r) => r.emoji === emoji);
    if (reaction) {
      reaction.users = reaction.users.filter((uid) => uid.toString() !== userId);
      if (reaction.users.length === 0) {
        announcement.reactions = announcement.reactions.filter((r) => r.emoji !== emoji);
      }
    }

    await announcement.save();

    // 重新获取并 populate 用户信息
    return this.findById(id);
  }

  // 置顶/取消置顶
  async togglePin(id: string, userId: string): Promise<AnnouncementDocument> {
    const announcement = await this.announcementModel.findById(id);
    if (!announcement) {
      throw new NotFoundException('公告不存在');
    }

    announcement.isPinned = !announcement.isPinned;
    await announcement.save();

    // 重新获取并 populate 用户信息
    return this.findById(id);
  }

  // 归档公告
  async archive(id: string, userId: string): Promise<AnnouncementDocument> {
    const announcement = await this.announcementModel.findById(id);
    if (!announcement) {
      throw new NotFoundException('公告不存在');
    }

    if (announcement.createdBy.toString() !== userId) {
      throw new ForbiddenException('无权归档此公告');
    }

    announcement.status = AnnouncementStatus.ARCHIVED;
    return announcement.save();
  }

  // 获取统计信息
  async getStatistics(familyId: string): Promise<{
    total: number;
    pinned: number;
    pending: number;
    thisWeek: number;
  }> {
    const familyObjId = new Types.ObjectId(familyId);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [total, pinned, pending, thisWeek] = await Promise.all([
      this.announcementModel.countDocuments({
        familyId: familyObjId,
        status: AnnouncementStatus.PUBLISHED,
      }),
      this.announcementModel.countDocuments({
        familyId: familyObjId,
        status: AnnouncementStatus.PUBLISHED,
        isPinned: true,
      }),
      this.announcementModel.countDocuments({
        familyId: familyObjId,
        status: AnnouncementStatus.PUBLISHED,
        requireConfirmation: true,
      }),
      this.announcementModel.countDocuments({
        familyId: familyObjId,
        createdAt: { $gte: weekAgo },
      }),
    ]);

    return { total, pinned, pending, thisWeek };
  }
}
