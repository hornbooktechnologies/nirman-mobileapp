import { ForbiddenException } from '@nestjs/common';
import type { PlatformAdminPermissionKey } from '@nirman-app/shared';
import type { AuthenticatedUser } from './types/auth.types';

const PLATFORM_ROLE_NAMES = new Set([
  'Platform Super Admin',
  'Super Admin',
  'User Manager',
]);

const PLATFORM_SUPER_ADMIN_ROLE_NAMES = new Set([
  'Platform Super Admin',
  'Super Admin',
]);

const PROTECTED_PLATFORM_SUPER_ADMIN_PERMISSIONS = new Set<PlatformAdminPermissionKey>([
  'platform-roles:read',
  'platform-roles:create',
  'platform-roles:update',
  'platform-roles:delete',
  'platform-roles:manage',
]);

export function isPlatformUser(user: AuthenticatedUser): boolean {
  return PLATFORM_ROLE_NAMES.has(user.roleName);
}

export function isPlatformSuperAdmin(user: AuthenticatedUser): boolean {
  return PLATFORM_SUPER_ADMIN_ROLE_NAMES.has(user.roleName);
}

export function assertPlatformPermission(
  user: AuthenticatedUser,
  requiredPermission: PlatformAdminPermissionKey,
): void {
  if (!isPlatformUser(user)) {
    throw new ForbiddenException('Platform administration access is required');
  }

  const [resource, action] = requiredPermission.split(':');
  const allowed = user.permissions.some(
    (permission) =>
      permission.resource === resource && permission.action === action,
  );

  const protectedSuperAdminCapability =
    isPlatformSuperAdmin(user) &&
    PROTECTED_PLATFORM_SUPER_ADMIN_PERMISSIONS.has(requiredPermission);

  if (!allowed && !protectedSuperAdminCapability) {
    throw new ForbiddenException(
      'You do not have permission to perform this platform action',
    );
  }
}
