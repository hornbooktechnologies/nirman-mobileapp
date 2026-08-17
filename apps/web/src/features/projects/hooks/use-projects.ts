"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectsService } from "@/features/projects/services/projects.service";
import type { ProjectQuery } from "@/features/projects/types/projects.types";

export const projectKeys = {
  all: (organizationId: string) => ["projects", organizationId] as const,
  list: (organizationId: string, query?: ProjectQuery) =>
    ["projects", organizationId, "list", query ?? {}] as const,
  detail: (organizationId: string, projectId: string) =>
    ["projects", organizationId, projectId] as const,
  members: (organizationId: string, projectId: string) =>
    ["projects", organizationId, projectId, "members"] as const,
  access: (organizationId: string) => ["projects", organizationId, "access"] as const,
  organizationAssignments: (organizationId: string) =>
    ["projects", organizationId, "member-assignments"] as const,
};

export function useProjects(organizationId: string | null, query?: ProjectQuery) {
  return useQuery({
    queryKey: projectKeys.list(organizationId ?? "none", query),
    queryFn: () => projectsService.projects(organizationId!, query),
    enabled: Boolean(organizationId),
  });
}

export function useProject(organizationId: string | null, projectId: string) {
  return useQuery({
    queryKey: projectKeys.detail(organizationId ?? "none", projectId),
    queryFn: () => projectsService.project(organizationId!, projectId),
    enabled: Boolean(organizationId && projectId),
  });
}

export function useProjectMembers(organizationId: string | null, projectId: string) {
  return useQuery({
    queryKey: projectKeys.members(organizationId ?? "none", projectId),
    queryFn: () => projectsService.members(organizationId!, projectId),
    enabled: Boolean(organizationId && projectId),
  });
}

export function useProjectAccess(organizationId: string | null) {
  return useQuery({
    queryKey: projectKeys.access(organizationId ?? "none"),
    queryFn: () => projectsService.projectAccess(organizationId!),
    enabled: Boolean(organizationId),
  });
}

export function useOrganizationProjectAssignments(
  organizationId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: projectKeys.organizationAssignments(organizationId ?? "none"),
    queryFn: () =>
      projectsService.organizationProjectAssignments(organizationId!),
    enabled: Boolean(organizationId) && enabled,
  });
}

export function useCreateProject(organizationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof projectsService.createProject>[1]) =>
      projectsService.createProject(organizationId!, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: projectKeys.all(organizationId ?? "none") }),
  });
}

export function useUpdateProject(organizationId: string | null, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof projectsService.updateProject>[2]) =>
      projectsService.updateProject(organizationId!, projectId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all(organizationId ?? "none") });
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(organizationId ?? "none", projectId),
      });
    },
  });
}

export function useArchiveProject(organizationId: string | null, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => projectsService.archiveProject(organizationId!, projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all(organizationId ?? "none") });
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(organizationId ?? "none", projectId),
      });
    },
  });
}

export function useRestoreProject(organizationId: string | null, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => projectsService.restoreProject(organizationId!, projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all(organizationId ?? "none") });
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(organizationId ?? "none", projectId),
      });
    },
  });
}

export function useAssignProjectMember(organizationId: string | null, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      input,
    }: {
      memberId: string;
      input: Parameters<typeof projectsService.assignMember>[3];
    }) => projectsService.assignMember(organizationId!, projectId, memberId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: projectKeys.members(organizationId ?? "none", projectId),
      }),
  });
}

export function useUpdateProjectMember(organizationId: string | null, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      input,
    }: {
      memberId: string;
      input: Parameters<typeof projectsService.updateMember>[3];
    }) => projectsService.updateMember(organizationId!, projectId, memberId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: projectKeys.members(organizationId ?? "none", projectId),
      }),
  });
}

export function useUnassignProjectMember(organizationId: string | null, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      projectsService.unassignMember(organizationId!, projectId, memberId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: projectKeys.members(organizationId ?? "none", projectId),
      }),
  });
}

export function useSaveMemberProjectAssignments(
  organizationId: string | null,
  memberId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      input: Parameters<typeof projectsService.saveMemberProjectAssignments>[2],
    ) =>
      projectsService.saveMemberProjectAssignments(
        organizationId!,
        memberId,
        input,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.organizationAssignments(
          organizationId ?? "none",
        ),
      });
      void queryClient.invalidateQueries({
        queryKey: projectKeys.all(organizationId ?? "none"),
      });
    },
  });
}
