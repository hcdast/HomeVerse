import { useAuthStore } from '../store/authStore';
import { UserRole } from '../services/familyService';

// 资源类型
export enum Resource {
  ALBUMS = 'albums',
  FILES = 'files',
  ARTICLES = 'articles',
  MEMBERS = 'members',
  FAMILY = 'family',
}

// 操作类型
export enum Action {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  MANAGE = 'manage',
}

// 角色权限映射
const RolePermissions: Record<UserRole, Record<Resource, Action[]>> = {
  [UserRole.OWNER]: {
    [Resource.ALBUMS]: [Action.READ, Action.WRITE, Action.DELETE, Action.MANAGE],
    [Resource.FILES]: [Action.READ, Action.WRITE, Action.DELETE, Action.MANAGE],
    [Resource.ARTICLES]: [Action.READ, Action.WRITE, Action.DELETE, Action.MANAGE],
    [Resource.MEMBERS]: [Action.READ, Action.WRITE, Action.DELETE, Action.MANAGE],
    [Resource.FAMILY]: [Action.READ, Action.WRITE, Action.DELETE, Action.MANAGE],
  },
  [UserRole.ADMIN]: {
    [Resource.ALBUMS]: [Action.READ, Action.WRITE, Action.DELETE],
    [Resource.FILES]: [Action.READ, Action.WRITE, Action.DELETE],
    [Resource.ARTICLES]: [Action.READ, Action.WRITE, Action.DELETE],
    [Resource.MEMBERS]: [Action.READ, Action.WRITE],
    [Resource.FAMILY]: [Action.READ],
  },
  [UserRole.EDITOR]: {
    [Resource.ALBUMS]: [Action.READ, Action.WRITE],
    [Resource.FILES]: [Action.READ, Action.WRITE],
    [Resource.ARTICLES]: [Action.READ, Action.WRITE],
    [Resource.MEMBERS]: [Action.READ],
    [Resource.FAMILY]: [Action.READ],
  },
  [UserRole.VIEWER]: {
    [Resource.ALBUMS]: [Action.READ],
    [Resource.FILES]: [Action.READ],
    [Resource.ARTICLES]: [Action.READ],
    [Resource.MEMBERS]: [Action.READ],
    [Resource.FAMILY]: [Action.READ],
  },
  [UserRole.MEMBER]: {
    [Resource.ALBUMS]: [Action.READ, Action.WRITE],
    [Resource.FILES]: [Action.READ, Action.WRITE],
    [Resource.ARTICLES]: [Action.READ],
    [Resource.MEMBERS]: [Action.READ],
    [Resource.FAMILY]: [Action.READ],
  },
};

export const usePermissions = () => {
  const { user } = useAuthStore();

  // 检查是否有权限
  const hasPermission = (resource: Resource, action: Action): boolean => {
    if (!user) return false;

    const role = user.role as UserRole;
    
    // 检查角色默认权限
    const rolePerms = RolePermissions[role];
    if (rolePerms && rolePerms[resource]) {
      if (rolePerms[resource].includes(action)) {
        return true;
      }
    }

    // 检查自定义权限
    if (user.permissions && user.permissions[resource as keyof typeof user.permissions]) {
      const customPerms = user.permissions[resource as keyof typeof user.permissions];
      if (customPerms) {
        switch (action) {
          case Action.READ:
            return customPerms.read === true;
          case Action.WRITE:
            return customPerms.write === true;
          case Action.DELETE:
            return customPerms.delete === true;
        }
      }
    }

    return false;
  };

  // 检查是否有角色
  const hasRole = (...roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role as UserRole);
  };

  // 是否是所有者
  const isOwner = (): boolean => {
    return user?.role === UserRole.OWNER;
  };

  // 是否是管理员或更高
  const isAdminOrHigher = (): boolean => {
    return hasRole(UserRole.OWNER, UserRole.ADMIN);
  };

  // 是否可以编辑
  const canEdit = (resource: Resource): boolean => {
    return hasPermission(resource, Action.WRITE);
  };

  // 是否可以删除
  const canDelete = (resource: Resource): boolean => {
    return hasPermission(resource, Action.DELETE);
  };

  // 是否可以查看
  const canView = (resource: Resource): boolean => {
    return hasPermission(resource, Action.READ);
  };

  // 是否可以管理
  const canManage = (resource: Resource): boolean => {
    return hasPermission(resource, Action.MANAGE);
  };

  return {
    hasPermission,
    hasRole,
    isOwner,
    isAdminOrHigher,
    canEdit,
    canDelete,
    canView,
    canManage,
    userRole: user?.role as UserRole,
  };
};

