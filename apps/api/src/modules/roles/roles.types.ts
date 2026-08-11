import type { DbRow } from '../../database/database.types';

export interface PermissionEntity {
  id: string;
  resource: string;
  action: string;
  roleId: string;
}

export interface RoleEntity {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  permissions?: PermissionEntity[];
  _count: {
    users: number;
    permissions: number;
  };
}

export interface RoleRow extends DbRow {
  id: string;
  name: string;
  description: string | null;
  isSystem: number | boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  userCount?: number;
  permissionCount?: number;
}

export interface PermissionRow extends DbRow {
  id: string;
  resource: string;
  action: string;
  roleId: string;
}
