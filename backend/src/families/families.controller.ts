import { Controller, Get, Put, Post, Body, Param, UseGuards, Request, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FamiliesService } from './families.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('families')
@UseGuards(JwtAuthGuard)
export class FamiliesController {
  constructor(
    private readonly familiesService: FamiliesService,
    private readonly usersService: UsersService,
  ) {}

  // 获取当前用户的家庭信息
  @Get('my-family')
  async getMyFamily(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    return this.familiesService.findById(user.familyId);
  }

  // 更新家庭信息
  @Put(':id')
  async updateFamily(@Param('id') id: string, @Body() updateDto: any, @Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    const family = await this.familiesService.findById(id);
    
    if (!family) {
      throw new NotFoundException('家庭不存在');
    }
    
    // 检查权限：只有家庭成员可以更新
    if (family.createdBy.toString() !== req.user.userId && !family.members.includes(req.user.userId)) {
      throw new ForbiddenException('无权访问此家庭');
    }
    
    return this.familiesService.update(id, updateDto);
  }

  // 邀请家庭成员
  @Post(':id/invite')
  async inviteMember(@Param('id') id: string, @Body() body: { email: string }, @Request() req) {
    const family = await this.familiesService.findById(id);
    if (!family) {
      throw new NotFoundException('家庭不存在');
    }
    
    // 验证权限：只有家庭成员可以邀请
    if (family.createdBy.toString() !== req.user.userId && !family.members.includes(req.user.userId)) {
      throw new ForbiddenException('无权访问此家庭');
    }
    
    const user = await this.usersService.findByEmail(body.email);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    
    return this.familiesService.addMember(id, user._id.toString());
  }
}

