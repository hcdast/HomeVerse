import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationStatus, NotificationType } from './schemas/notification.schema';
import { CreateNotificationDto, QueryNotificationsDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  // 创建通知
  async create(createDto: CreateNotificationDto): Promise<Notification> {
    const notification = new this.notificationModel(createDto);
    return notification.save();
  }

  // 批量创建通知（给多个用户发送）
  async createBatch(recipients: string[], notificationData: Omit<CreateNotificationDto, 'recipient'>): Promise<any[]> {
    const notifications = recipients.map(recipient => ({
      ...notificationData,
      recipient: new Types.ObjectId(recipient),
      sender: notificationData.sender ? new Types.ObjectId(notificationData.sender) : undefined,
      familyId: notificationData.familyId ? new Types.ObjectId(notificationData.familyId) : undefined,
    }));
    return this.notificationModel.insertMany(notifications);
  }

  // 获取用户通知列表
  async findByUser(
    userId: string,
    query: QueryNotificationsDto,
  ): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    const { status, type, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const filter: any = { recipient: new Types.ObjectId(userId) };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const [notifications, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'username avatar')
        .exec(),
      this.notificationModel.countDocuments(filter),
      this.notificationModel.countDocuments({
        recipient: new Types.ObjectId(userId),
        status: NotificationStatus.UNREAD,
      }),
    ]);

    return { notifications, total, unreadCount };
  }

  // 获取未读通知数量
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      recipient: new Types.ObjectId(userId),
      status: NotificationStatus.UNREAD,
    });
  }

  // 标记为已读
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        recipient: new Types.ObjectId(userId),
      },
      {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
      { new: true },
    );

    if (!notification) {
      throw new NotFoundException('通知不存在');
    }

    return notification;
  }

  // 标记所有为已读
  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await this.notificationModel.updateMany(
      {
        recipient: new Types.ObjectId(userId),
        status: NotificationStatus.UNREAD,
      },
      {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    );

    return { modifiedCount: result.modifiedCount };
  }

  // 删除通知
  async delete(notificationId: string, userId: string): Promise<void> {
    const result = await this.notificationModel.deleteOne({
      _id: new Types.ObjectId(notificationId),
      recipient: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('通知不存在');
    }
  }

  // 清空已读通知
  async clearRead(userId: string): Promise<{ deletedCount: number }> {
    const result = await this.notificationModel.deleteMany({
      recipient: new Types.ObjectId(userId),
      status: NotificationStatus.READ,
    });

    return { deletedCount: result.deletedCount };
  }

  // ============= 业务通知创建方法 =============

  // 发送成员邀请通知
  async notifyMemberInvited(recipientId: string, familyId: string, inviterName: string) {
    return this.create({
      recipient: recipientId,
      familyId,
      type: NotificationType.MEMBER_INVITED,
      title: '家庭邀请',
      content: `${inviterName} 邀请您加入家庭`,
      link: '/family-members',
    });
  }

  // 发送成员加入通知（通知家庭所有成员）
  async notifyMemberJoined(familyMemberIds: string[], familyId: string, newMemberName: string) {
    return this.createBatch(familyMemberIds, {
      familyId,
      type: NotificationType.MEMBER_JOINED,
      title: '新成员加入',
      content: `${newMemberName} 加入了家庭`,
      link: '/family-members',
    });
  }

  // 发送角色变更通知
  async notifyRoleChanged(recipientId: string, familyId: string, newRole: string, operatorName: string) {
    return this.create({
      recipient: recipientId,
      familyId,
      type: NotificationType.ROLE_CHANGED,
      title: '角色变更',
      content: `${operatorName} 将您的角色变更为 ${newRole}`,
      link: '/profile',
    });
  }

  // 发送文章评论通知
  async notifyArticleCommented(
    authorId: string,
    familyId: string,
    articleId: string,
    articleTitle: string,
    commenterName: string,
    commentContent: string,
  ) {
    return this.create({
      recipient: authorId,
      familyId,
      type: NotificationType.ARTICLE_COMMENTED,
      title: '新评论',
      content: `${commenterName} 评论了您的文章《${articleTitle}》：${commentContent.substring(0, 50)}...`,
      metadata: { articleId },
      link: `/articles/${articleId}`,
    });
  }

  // 发送文章点赞通知
  async notifyArticleLiked(authorId: string, familyId: string, articleId: string, articleTitle: string, likerName: string) {
    return this.create({
      recipient: authorId,
      familyId,
      type: NotificationType.ARTICLE_LIKED,
      title: '新点赞',
      content: `${likerName} 点赞了您的文章《${articleTitle}》`,
      metadata: { articleId },
      link: `/articles/${articleId}`,
    });
  }

  // 发送权限变更通知
  async notifyPermissionChanged(recipientId: string, familyId: string, operatorName: string) {
    return this.create({
      recipient: recipientId,
      familyId,
      type: NotificationType.PERMISSION_CHANGED,
      title: '权限变更',
      content: `${operatorName} 修改了您的权限设置`,
      link: '/profile',
    });
  }
}

