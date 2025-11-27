import api from './api';

// 角色枚举
export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
  MEMBER = 'member',
}

// 成员接口
export interface FamilyMember {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  role: UserRole;
  permissions?: {
    albums?: { read: boolean; write: boolean; delete: boolean };
    files?: { read: boolean; write: boolean; delete: boolean };
    articles?: { read: boolean; write: boolean; delete: boolean };
    members?: { read: boolean; write: boolean; delete: boolean };
  };
  createdAt: string;
}

// 家庭信息接口
export interface Family {
  _id: string;
  name: string;
  description?: string;
  createdBy: string;
  members: string[];
  settings?: any;
  createdAt: string;
}

class FamilyService {
  // 获取我的家庭信息
  async getMyFamily(): Promise<Family> {
    try {
      const response = await api.get('/families/my-family');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '获取家庭信息失败');
    }
  }

  // 获取家庭成员列表
  async getMembers(familyId: string): Promise<FamilyMember[]> {
    try {
      const response = await api.get(`/families/${familyId}/members`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '获取成员列表失败');
    }
  }

  // 邀请成员
  async inviteMember(
    familyId: string,
    email: string,
    role: UserRole = UserRole.MEMBER
  ): Promise<{ message: string; inviteToken?: string; user?: any }> {
    try {
      const response = await api.post(`/families/${familyId}/invite`, {
        email,
        role,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '邀请成员失败');
    }
  }

  // 更新成员角色
  async updateMemberRole(
    familyId: string,
    memberId: string,
    role: UserRole
  ): Promise<FamilyMember> {
    try {
      const response = await api.put(
        `/families/${familyId}/members/${memberId}/role`,
        { role }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '更新角色失败');
    }
  }

  // 更新成员权限
  async updateMemberPermissions(
    familyId: string,
    memberId: string,
    permissions: any
  ): Promise<FamilyMember> {
    try {
      const response = await api.put(
        `/families/${familyId}/members/${memberId}/permissions`,
        { permissions }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '更新权限失败');
    }
  }

  // 移除成员
  async removeMember(familyId: string, memberId: string): Promise<{ message: string }> {
    try {
      const response = await api.delete(`/families/${familyId}/members/${memberId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '移除成员失败');
    }
  }

  // 转让所有权
  async transferOwnership(
    familyId: string,
    newOwnerId: string
  ): Promise<{ message: string; currentOwner: any; newOwner: any }> {
    try {
      const response = await api.post(`/families/${familyId}/transfer-ownership`, {
        newOwnerId,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '转让所有权失败');
    }
  }

  // 更新家庭信息
  async updateFamily(familyId: string, data: Partial<Family>): Promise<Family> {
    try {
      const response = await api.put(`/families/${familyId}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '更新家庭信息失败');
    }
  }
}

export default new FamilyService();

// 角色描述
export const RoleDescriptions: Record<UserRole, string> = {
  [UserRole.OWNER]: '所有者 - 拥有所有权限',
  [UserRole.ADMIN]: '管理员 - 管理权限',
  [UserRole.EDITOR]: '编辑者 - 编辑内容',
  [UserRole.VIEWER]: '访客 - 只读权限',
  [UserRole.MEMBER]: '成员 - 基础权限',
};

// 角色图标
export const RoleIcons: Record<UserRole, string> = {
  [UserRole.OWNER]: '👑',
  [UserRole.ADMIN]: '🛡️',
  [UserRole.EDITOR]: '✏️',
  [UserRole.VIEWER]: '👁️',
  [UserRole.MEMBER]: '👤',
};

// 角色颜色
export const RoleColors: Record<UserRole, string> = {
  [UserRole.OWNER]: '#ffd700',
  [UserRole.ADMIN]: '#ff6b6b',
  [UserRole.EDITOR]: '#4ecdc4',
  [UserRole.VIEWER]: '#95a5a6',
  [UserRole.MEMBER]: '#3498db',
};

