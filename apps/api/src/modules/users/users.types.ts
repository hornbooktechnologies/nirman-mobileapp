import type { DbRow } from '../../database/database.types';

export interface RoleEntity {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface UserEntity {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  roleId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  role?: RoleEntity;
}

export interface UserRow extends DbRow {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string | null;
  avatar: string | null;
  isActive: number | boolean;
  roleId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  role_id: string | null;
  role_name: string | null;
  role_description: string | null;
  role_isSystem: number | boolean | null;
  role_createdAt: Date | null;
  role_updatedAt: Date | null;
  role_createdBy: string | null;
  role_updatedBy: string | null;
}
