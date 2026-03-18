import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument, MessageType } from './schemas/message.schema';
import { SendMessageDto, QueryMessagesDto } from './dto/message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name)
    private messageModel: Model<MessageDocument>,
  ) {}

  // 发送消息
  async sendMessage(
    familyId: string,
    senderId: string,
    senderName: string,
    senderAvatar: string | undefined,
    dto: SendMessageDto,
  ): Promise<Message> {
    const message = new this.messageModel({
      familyId: new Types.ObjectId(familyId),
      senderId: new Types.ObjectId(senderId),
      senderName,
      senderAvatar,
      type: dto.type || MessageType.TEXT,
      content: dto.content,
      fileUrl: dto.fileUrl,
      fileName: dto.fileName,
      fileSize: dto.fileSize,
      replyTo: dto.replyTo ? new Types.ObjectId(dto.replyTo) : undefined,
      readBy: [new Types.ObjectId(senderId)], // 发送者自动已读
    });

    const savedMessage = await message.save();
    
    // 如果有回复，填充回复消息
    if (dto.replyTo) {
      await savedMessage.populate('replyTo', 'content senderName type');
    }
    
    return savedMessage;
  }

  // 获取消息历史
  async getMessages(familyId: string, query: QueryMessagesDto): Promise<Message[]> {
    const { limit = 50, before, after } = query;
    const filter: any = {
      familyId: new Types.ObjectId(familyId),
      isDeleted: false,
    };

    // 游标分页
    if (before) {
      filter._id = { $lt: new Types.ObjectId(before) };
    } else if (after) {
      filter._id = { $gt: new Types.ObjectId(after) };
    }

    const messages = await this.messageModel
      .find(filter)
      .sort({ createdAt: before ? -1 : 1 }) // before时降序取，after或初始加载时升序
      .limit(Math.min(limit, 100))
      .populate('replyTo', 'content senderName type')
      .exec();

    // 如果是获取更早的消息(before)，需要反转顺序以正序显示（旧消息在前）
    return before ? messages.reverse() : messages;
  }

  // 标记消息已读
  async markAsRead(familyId: string, userId: string, messageIds: string[]): Promise<void> {
    await this.messageModel.updateMany(
      {
        _id: { $in: messageIds.map(id => new Types.ObjectId(id)) },
        familyId: new Types.ObjectId(familyId),
      },
      {
        $addToSet: { readBy: new Types.ObjectId(userId) },
      },
    );
  }

  // 删除消息（软删除）
  async deleteMessage(messageId: string, userId: string, familyId: string): Promise<void> {
    const message = await this.messageModel.findOne({
      _id: new Types.ObjectId(messageId),
      familyId: new Types.ObjectId(familyId),
    });

    if (!message) {
      throw new NotFoundException('消息不存在');
    }

    // 只有发送者可以删除自己的消息
    if (message.senderId.toString() !== userId) {
      throw new ForbiddenException('无权删除此消息');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = '此消息已被删除';
    await message.save();
  }

  // 获取未读消息数量
  async getUnreadCount(familyId: string, userId: string): Promise<number> {
    return this.messageModel.countDocuments({
      familyId: new Types.ObjectId(familyId),
      isDeleted: false,
      readBy: { $ne: new Types.ObjectId(userId) },
    });
  }

  // 获取最新消息（用于预览）
  async getLatestMessage(familyId: string): Promise<Message | null> {
    return this.messageModel
      .findOne({
        familyId: new Types.ObjectId(familyId),
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  // 搜索消息
  async searchMessages(familyId: string, keyword: string, limit = 20): Promise<Message[]> {
    return this.messageModel
      .find({
        familyId: new Types.ObjectId(familyId),
        isDeleted: false,
        type: MessageType.TEXT,
        content: { $regex: keyword, $options: 'i' },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}



