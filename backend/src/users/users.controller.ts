import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard) // 需要JWT认证
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 获取当前用户资料
  @Get('profile')
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    const { password, ...result } = user.toObject();
    return result;
  }

  // 更新用户资料
  @Put('profile')
  async updateProfile(@Request() req, @Body() updateDto: any) {
    return this.usersService.update(req.user.userId, updateDto);
  }

  // 获取家庭成员列表
  @Get('family-members')
  async getFamilyMembers(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    return this.usersService.findFamilyMembers(user.familyId);
  }
}

