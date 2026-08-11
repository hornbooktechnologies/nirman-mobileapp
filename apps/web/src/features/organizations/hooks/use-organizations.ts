"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { organizationsService } from "@/features/organizations/services/organizations.service";
import { useAuth } from "@/features/auth/hooks/use-auth";

export const organizationKeys = {
  all: ["organizations"] as const,
  detail: (id: string) => ["organizations", id] as const,
  members: (id: string) => ["organizations", id, "members"] as const,
};

export function useOrganizations() {
  return useQuery({
    queryKey: organizationKeys.all,
    queryFn: organizationsService.organizations,
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: organizationKeys.detail(id),
    queryFn: () => organizationsService.organization(id),
  });
}

export function useOrganizationMembers(id: string) {
  return useQuery({
    queryKey: organizationKeys.members(id),
    queryFn: () => organizationsService.members(id),
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationsService.createOrganization,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
  });
}

export function useUpdateOrganization(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof organizationsService.updateOrganization>[1]) =>
      organizationsService.updateOrganization(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      void queryClient.invalidateQueries({ queryKey: organizationKeys.detail(id) });
    },
  });
}

export function useSwitchOrganization() {
  const { refreshUser } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationsService.switchOrganization,
    onSuccess: async (result) => {
      await refreshUser(result.activeOrganizationId);
      await queryClient.invalidateQueries();
    },
  });
}

export function useUpdateOrganizationMember(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      input,
    }: {
      memberId: string;
      input: Parameters<typeof organizationsService.updateMember>[2];
    }) => organizationsService.updateMember(organizationId, memberId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: organizationKeys.members(organizationId) }),
  });
}

export function useDeactivateOrganizationMember(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      organizationsService.deactivateMember(organizationId, memberId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: organizationKeys.members(organizationId) }),
  });
}
