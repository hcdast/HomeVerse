import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards, Request, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { FamiliesService } from './families.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { UserRole, Resource, Permission } from '../common/enums/role.enum';
import { InviteMemberDto, UpdateMemberRoleDto, UpdateMemberPermissionsDto } from './dto/family-member.dto';

@Controller('families')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class FamiliesController {
  private readonly logger = new Logger(FamiliesController.name);

  constructor(
    private readonly familiesService: FamiliesService,
  ) {}

  // 获取当前用户的家庭信息
  @Get('my-family')
  async getMyFamily(@Request() req) {
    if (!req.user.familyId) {
      throw new NotFoundException('您还未加入任何家庭');
    }
    return this.familiesService.findById(req.user.familyId);
  }

  // 获取家庭所有成员
  @Get(':id/members')
  @RequirePermissions({ resource: Resource.MEMBERS, action: Permission.READ })
  async getMembers(@Param('id') id: string, @Request() req) {
    if (req.user.familyId !== id) {
      throw new ForbiddenException('无权访问此家庭');
    }
    return this.familiesService.getMembers(id);
  }

  // 邀请成员
  @Post(':id/invite')
  @RequirePermissions({ resource: Resource.MEMBERS, action: Permission.WRITE })
  async inviteMember(
    @Param('id') id: string,
    @Body() inviteDto: InviteMemberDto,
    @Request() req,
  ) {
    if (req.user.familyId !== id) {
      throw new ForbiddenException('无权访问此家庭');
    }

    return this.familiesService.inviteMember(
      id,
      inviteDto.email,
      inviteDto.role || UserRole.MEMBER,
    );
  }

  // 更新成员角色
  @Put(':id/members/:memberId/role')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
    @Request() req,
  ) {
    if (req.user.familyId !== id) {
      throw new ForbiddenException('无权访问此家庭');
    }

    return this.familiesService.updateMemberRole(
      id,
      memberId,
      updateRoleDto.role,
      req.user.role,
    );
  }

  // 更新成员自定义权限
  @Put(':id/members/:memberId/permissions')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async updateMemberPermissions(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() updatePermissionsDto: UpdateMemberPermissionsDto,
    @Request() req,
  ) {
    if (req.user.familyId !== id) {
      throw new ForbiddenException('无权访问此家庭');
    }

    return this.familiesService.updateMemberPermissions(
      id,
      memberId,
      updatePermissionsDto.permissions,
      req.user.role,
    );
  }

  // 移除成员
  @Delete(':id/members/:memberId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req,
  ) {
    if (req.user.familyId !== id) {
      throw new ForbiddenException('无权访问此家庭');
    }

    return this.familiesService.removeMemberEnhanced(
      id,
      memberId,
      req.user.userId,
      req.user.role,
    );
  }

  // 转让所有权
  @Post(':id/transfer-ownership')
  @Roles(UserRole.OWNER)
  async transferOwnership(
    @Param('id') id: string,
    @Body() body: { newOwnerId: string },
    @Request() req,
  ) {
    if (req.user.familyId !== id) {
      throw new ForbiddenException('无权访问此家庭');
    }

    return this.familiesService.transferOwnership(id, req.user.userId, body.newOwnerId);
  }

  // 更新家庭信息
  @Put(':id')
  @RequirePermissions({ resource: Resource.FAMILY, action: Permission.WRITE })
  async updateFamily(@Param('id') id: string, @Body() updateDto: any, @Request() req) {
    if (req.user.familyId !== id) {
      throw new ForbiddenException('无权访问此家庭');
    }
    
    return this.familiesService.update(id, updateDto);
  }
}

