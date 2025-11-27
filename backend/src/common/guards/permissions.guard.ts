import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, RequiredPermission } from '../decorators/permissions.decorator';
import { RolePermissions, UserRole, Permission } from '../enums/role.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<RequiredPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    // 检查每个所需权限
    for (const required of requiredPermissions) {
      if (!this.hasPermission(user, required.resource, required.action)) {
        throw new ForbiddenException(
          `您没有权限执行此操作。需要权限: ${required.resource}.${required.action}`
        );
      }
    }

    return true;
  }

  private hasPermission(user: any, resource: string, action: Permission): boolean {
    const role = user.role as UserRole;
    
    // 检查角色默认权限
    const rolePermissions = RolePermissions[role];
    if (rolePermissions && rolePermissions[resource]) {
      if (rolePermissions[resource].includes(action)) {
        return true;
      }
    }

    // 检查自定义权限
    if (user.permissions && user.permissions[resource]) {
      const customPerms = user.permissions[resource];
      switch (action) {
        case Permission.READ:
          return customPerms.read === true;
        case Permission.WRITE:
          return customPerms.write === true;
        case Permission.DELETE:
          return customPerms.delete === true;
        default:
          return false;
      }
    }

    return false;
  }
}

