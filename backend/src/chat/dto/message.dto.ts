import { IsString, IsOptional, IsEnum, IsMongoId, MaxLength } from 'class-validator';
import { MessageType } from '../schemas/message.schema';

export class SendMessageDto {
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType = MessageType.TEXT;

  @IsString()
  @MaxLength(5000)
  content: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsOptional()
  fileSize?: number;

  @IsMongoId()
  @IsOptional()
  replyTo?: string;
}

export class QueryMessagesDto {
  @IsOptional()
  limit?: number = 50;

  @IsOptional()
  before?: string; // 游标分页：获取此消息ID之前的消息

  @IsOptional()
  after?: string; // 游标分页：获取此消息ID之后的消息
}

export class MessageResponseDto {
  _id: string;
  familyId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: MessageType;
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyTo?: any;
  readBy: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}



