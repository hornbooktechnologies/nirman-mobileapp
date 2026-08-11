export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions?: Permission[];
  userCount?: number;
  permissionCount?: number;
  updatedAt?: string;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  roleId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  roleId: string;
  role: Role;
  createdAt: string;
}

export interface PaginatedUsers {
  data: User[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  };
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  roleId: string;
  isActive?: boolean;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
}

export interface RolePermissionInput {
  resource: string;
  action: string;
}
