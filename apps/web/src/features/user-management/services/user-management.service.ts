import { api } from "@/lib/api/api-client";
import type {
  CreateRoleInput,
  CreateUserInput,
  PaginatedUsers,
  Permission,
  Role,
  RolePermissionInput,
  UpdateRoleInput,
  User,
} from "@/features/user-management/types/user-management.types";

export const userManagementService = {
  users() {
    return api.get<PaginatedUsers>("/users");
  },
  user(id: string) {
    return api.get<User>(`/users/${id}`);
  },
  createUser(input: CreateUserInput) {
    return api.post<User, CreateUserInput>("/users", input);
  },
  roles() {
    return api.get<Role[]>("/roles");
  },
  role(id: string) {
    return api.get<Role>(`/roles/${id}`);
  },
  createRole(input: CreateRoleInput) {
    return api.post<Role, CreateRoleInput>("/roles", input);
  },
  updateRole(id: string, input: UpdateRoleInput) {
    return api.patch<Role, UpdateRoleInput>(`/roles/${id}`, input);
  },
  deleteRole(id: string) {
    return api.delete<null>(`/roles/${id}`);
  },
  replaceRolePermissions(id: string, permissions: RolePermissionInput[]) {
    return api.put<Role, { permissions: RolePermissionInput[] }>(
      `/roles/${id}/permissions`,
      { permissions },
    );
  },
  permissions(id: string) {
    return api.get<Permission[]>(`/roles/${id}/permissions`);
  },
};
