import React from 'react';
import { usePermissions, Resource, Action } from '../hooks/usePermissions';
import { UserRole } from '../services/familyService';

interface PermissionGateProps {
  children: React.ReactNode;
  resource?: Resource;
  action?: Action;
  roles?: UserRole[];
  fallback?: React.ReactNode;
}

/**
 * 权限控制组件
 * 用于根据用户权限显示或隐藏内容
 */
const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  resource,
  action,
  roles,
  fallback = null,
}) => {
  const { hasPermission, hasRole } = usePermissions();

  // 检查角色权限
  if (roles && roles.length > 0) {
    if (!hasRole(...roles)) {
      return <>{fallback}</>;
    }
  }

  // 检查资源权限
  if (resource && action) {
    if (!hasPermission(resource, action)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

export default PermissionGate;

