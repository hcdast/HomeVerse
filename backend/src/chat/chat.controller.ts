import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { QueryMessagesDto } from './dto/message.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // 获取消息历史
  @Get('messages')
  async getMessages(@Request() req: any, @Query() query: QueryMessagesDto) {
    const familyId = req.user.familyId;
    if (!familyId) {
      return { messages: [], total: 0 };
    }
    const messages = await this.chatService.getMessages(familyId, query);
    return { messages };
  }

  // 获取未读消息数量
  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const familyId = req.user.familyId;
    const userId = req.user.userId;
    if (!familyId) {
      return { count: 0 };
    }
    const count = await this.chatService.getUnreadCount(familyId, userId);
    return { count };
  }

  // 获取最新消息预览
  @Get('latest')
  async getLatestMessage(@Request() req: any) {
    const familyId = req.user.familyId;
    if (!familyId) {
      return { message: null };
    }
    const message = await this.chatService.getLatestMessage(familyId);
    return { message };
  }

  // 搜索消息
  @Get('search')
  async searchMessages(
    @Request() req: any,
    @Query('keyword') keyword: string,
    @Query('limit') limit?: number,
  ) {
    const familyId = req.user.familyId;
    if (!familyId || !keyword) {
      return { messages: [] };
    }
    const messages = await this.chatService.searchMessages(familyId, keyword, limit);
    return { messages };
  }

  // 标记消息已读
  @Post('read')
  async markAsRead(@Request() req: any, @Body('messageIds') messageIds: string[]) {
    const familyId = req.user.familyId;
    const userId = req.user.userId;
    if (!familyId || !messageIds?.length) {
      return { success: false };
    }
    await this.chatService.markAsRead(familyId, userId, messageIds);
    return { success: true };
  }

  // 删除消息
  @Delete('messages/:id')
  async deleteMessage(@Request() req: any, @Param('id') messageId: string) {
    const familyId = req.user.familyId;
    const userId = req.user.userId;
    await this.chatService.deleteMessage(messageId, userId, familyId);
    return { success: true };
  }
}



