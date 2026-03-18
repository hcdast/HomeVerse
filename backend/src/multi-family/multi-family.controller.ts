import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MultiFamilyService } from './multi-family.service';
import { MemberRole } from './schemas/family-membership.schema';

@Controller('multi-family')
@UseGuards(JwtAuthGuard)
export class MultiFamilyController {
  constructor(private readonly multiFamilyService: MultiFamilyService) {}

  // ============= 家庭管理 =============

  // 创建新家庭
  @Post('families')
  async createFamily(@Body() body: { name: string; description?: string }, @Request() req) {
    return this.multiFamilyService.createFamily(req.user.userId, body);
  }

  // 获取我的所有家庭
  @Get('families')
  async getMyFamilies(@Request() req) {
    return this.multiFamilyService.getUserFamilies(req.user.userId);
  }

  // 切换当前家庭
  @Post('families/:familyId/switch')
  async switchFamily(@Param('familyId') familyId: string, @Request() req) {
    return this.multiFamilyService.switchFamily(req.user.userId, familyId);
  }

  // 设置默认家庭
  @Put('families/:familyId/default')
  async setDefaultFamily(@Param('familyId') familyId: string, @Request() req) {
    await this.multiFamilyService.setDefaultFamily(req.user.userId, familyId);
    return { message: '已设为默认家庭' };
  }

  // 离开家庭
  @Post('families/:familyId/leave')
  async leaveFamily(@Param('familyId') familyId: string, @Request() req) {
    await this.multiFamilyService.leaveFamily(req.user.userId, familyId);
    return { message: '已离开家庭' };
  }

  // ============= 邀请管理 =============

  // 邀请成员
  @Post('families/:familyId/invite')
  async inviteMember(
    @Param('familyId') familyId: string,
    @Body() body: { email?: string; userId?: string; role?: MemberRole; relationship?: string },
    @Request() req,
  ) {
    return this.multiFamilyService.inviteMember(familyId, req.user.userId, body);
  }

  // 获取待处理邀请
  @Get('invitations')
  async getPendingInvitations(@Request() req) {
    return this.multiFamilyService.getPendingInvitations(req.user.userId);
  }

  // 接受邀请
  @Post('invitations/:familyId/accept')
  async acceptInvitation(@Param('familyId') familyId: string, @Request() req) {
    return this.multiFamilyService.acceptInvitation(req.user.userId, familyId);
  }

  // 拒绝邀请
  @Post('invitations/:familyId/reject')
  async rejectInvitation(@Param('familyId') familyId: string, @Request() req) {
    await this.multiFamilyService.rejectInvitation(req.user.userId, familyId);
    return { message: '已拒绝邀请' };
  }

  // ============= 成员管理 =============

  // 获取家庭成员列表
  @Get('families/:familyId/members')
  async getFamilyMembers(@Param('familyId') familyId: string) {
    return this.multiFamilyService.getFamilyMembers(familyId);
  }

  // 更新成员角色
  @Put('families/:familyId/members/:userId/role')
  async updateMemberRole(
    @Param('familyId') familyId: string,
    @Param('userId') userId: string,
    @Body() body: { role: MemberRole },
    @Request() req,
  ) {
    return this.multiFamilyService.updateMemberRole(familyId, userId, body.role, req.user.userId);
  }

  // 更新成员信息
  @Put('families/:familyId/members/:userId')
  async updateMemberInfo(
    @Param('familyId') familyId: string,
    @Param('userId') userId: string,
    @Body() body: { nickname?: string; relationship?: string; notificationsEnabled?: boolean },
  ) {
    return this.multiFamilyService.updateMemberInfo(familyId, userId, body);
  }

  // 移除成员
  @Delete('families/:familyId/members/:userId')
  async removeMember(
    @Param('familyId') familyId: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    await this.multiFamilyService.removeMember(familyId, userId, req.user.userId);
    return { message: '成员已移除' };
  }

  // 转让所有权
  @Post('families/:familyId/transfer-ownership')
  async transferOwnership(
    @Param('familyId') familyId: string,
    @Body() body: { newOwnerId: string },
    @Request() req,
  ) {
    await this.multiFamilyService.transferOwnership(familyId, req.user.userId, body.newOwnerId);
    return { message: '所有权已转让' };
  }

  // ============= 我的成员信息 =============

  // 更新我在某家庭的信息
  @Put('families/:familyId/my-info')
  async updateMyInfo(
    @Param('familyId') familyId: string,
    @Body() body: { nickname?: string; relationship?: string; notificationsEnabled?: boolean },
    @Request() req,
  ) {
    return this.multiFamilyService.updateMemberInfo(familyId, req.user.userId, body);
  }
}
