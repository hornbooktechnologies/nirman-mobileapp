import type { RoleEntity } from '../../roles/roles.types';
import type { UserEntity } from '../../users/users.types';

export interface UserWithRolePermissions extends UserEntity {
  role: RoleEntity & {
    permissions: { id: string; resource: string; action: string; roleId: string }[];
  };
}

export interface RefreshTokenWithUser {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  user: UserEntity;
}
