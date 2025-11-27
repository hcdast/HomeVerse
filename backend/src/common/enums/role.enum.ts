// 用户角色枚举
export enum UserRole {
  OWNER = 'owner',       // 所有者（家庭创建者）
  ADMIN = 'admin',       // 管理员（几乎所有权限）
  EDITOR = 'editor',     // 编辑者（可编辑内容）
  VIEWER = 'viewer',     // 访客（只读）
  MEMBER = 'member',     // 普通成员（基础权限）
}

// 权限操作枚举
export enum Permission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  MANAGE = 'manage',
}

// 资源类型枚举
export enum Resource {
  ALBUMS = 'albums',
  FILES = 'files',
  ARTICLES = 'articles',
  MEMBERS = 'members',
  FAMILY = 'family',
}

// 角色权限映射
export const RolePermissions = {
  [UserRole.OWNER]: {
    [Resource.ALBUMS]: [Permission.READ, Permission.WRITE, Permission.DELETE, Permission.MANAGE],
    [Resource.FILES]: [Permission.READ, Permission.WRITE, Permission.DELETE, Permission.MANAGE],
    [Resource.ARTICLES]: [Permission.READ, Permission.WRITE, Permission.DELETE, Permission.MANAGE],
    [Resource.MEMBERS]: [Permission.READ, Permission.WRITE, Permission.DELETE, Permission.MANAGE],
    [Resource.FAMILY]: [Permission.READ, Permission.WRITE, Permission.DELETE, Permission.MANAGE],
  },
  [UserRole.ADMIN]: {
    [Resource.ALBUMS]: [Permission.READ, Permission.WRITE, Permission.DELETE],
    [Resource.FILES]: [Permission.READ, Permission.WRITE, Permission.DELETE],
    [Resource.ARTICLES]: [Permission.READ, Permission.WRITE, Permission.DELETE],
    [Resource.MEMBERS]: [Permission.READ, Permission.WRITE],
    [Resource.FAMILY]: [Permission.READ],
  },
  [UserRole.EDITOR]: {
    [Resource.ALBUMS]: [Permission.READ, Permission.WRITE],
    [Resource.FILES]: [Permission.READ, Permission.WRITE],
    [Resource.ARTICLES]: [Permission.READ, Permission.WRITE],
    [Resource.MEMBERS]: [Permission.READ],
    [Resource.FAMILY]: [Permission.READ],
  },
  [UserRole.VIEWER]: {
    [Resource.ALBUMS]: [Permission.READ],
    [Resource.FILES]: [Permission.READ],
    [Resource.ARTICLES]: [Permission.READ],
    [Resource.MEMBERS]: [Permission.READ],
    [Resource.FAMILY]: [Permission.READ],
  },
  [UserRole.MEMBER]: {
    [Resource.ALBUMS]: [Permission.READ, Permission.WRITE],
    [Resource.FILES]: [Permission.READ, Permission.WRITE],
    [Resource.ARTICLES]: [Permission.READ],
    [Resource.MEMBERS]: [Permission.READ],
    [Resource.FAMILY]: [Permission.READ],
  },
};

// 角色描述
export const RoleDescriptions = {
  [UserRole.OWNER]: '所有者 - 拥有所有权限，可以管理家庭和成员',
  [UserRole.ADMIN]: '管理员 - 拥有管理权限，可以管理内容和部分成员',
  [UserRole.EDITOR]: '编辑者 - 可以创建和编辑内容',
  [UserRole.VIEWER]: '访客 - 只能查看内容',
  [UserRole.MEMBER]: '成员 - 基础权限，可以查看和创建个人内容',
};

