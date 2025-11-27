import { SetMetadata } from '@nestjs/common';
import { Permission, Resource } from '../enums/role.enum';

export const PERMISSIONS_KEY = 'permissions';

export interface RequiredPermission {
  resource: Resource;
  action: Permission;
}

export const RequirePermissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

