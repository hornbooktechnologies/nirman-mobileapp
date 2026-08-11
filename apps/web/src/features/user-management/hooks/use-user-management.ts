"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userManagementService } from "@/features/user-management/services/user-management.service";
import type {
  RolePermissionInput,
  UpdateRoleInput,
} from "@/features/user-management/types/user-management.types";

export const userManagementKeys = {
  users: ["user-management", "users"] as const,
  roles: ["user-management", "roles"] as const,
  user: (id: string) => ["user-management", "users", id] as const,
  role: (id: string) => ["user-management", "roles", id] as const,
};

export function useUsers() {
  return useQuery({
    queryKey: userManagementKeys.users,
    queryFn: userManagementService.users,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userManagementKeys.user(id),
    queryFn: () => userManagementService.user(id),
  });
}

export function useRoles() {
  return useQuery({
    queryKey: userManagementKeys.roles,
    queryFn: userManagementService.roles,
  });
}

export function useRole(id: string) {
  return useQuery({
    queryKey: userManagementKeys.role(id),
    queryFn: () => userManagementService.role(id),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userManagementService.createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userManagementKeys.users }),
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userManagementService.createRole,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userManagementKeys.roles }),
  });
}

export function useReplaceRolePermissions(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (permissions: RolePermissionInput[]) =>
      userManagementService.replaceRolePermissions(id, permissions),
    onSuccess: (role) => {
      queryClient.setQueryData(userManagementKeys.role(id), role);
      return queryClient.invalidateQueries({
        queryKey: userManagementKeys.roles,
      });
    },
  });
}

export function useUpdateRole(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRoleInput) =>
      userManagementService.updateRole(id, input),
    onSuccess: (role) => {
      queryClient.setQueryData(userManagementKeys.role(id), role);
      return queryClient.invalidateQueries({
        queryKey: userManagementKeys.roles,
      });
    },
  });
}

export function useDeleteRole(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => userManagementService.deleteRole(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: userManagementKeys.role(id) });
      return queryClient.invalidateQueries({
        queryKey: userManagementKeys.roles,
      });
    },
  });
}
