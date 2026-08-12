"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workersService } from "@/features/workers/services/workers.service";
import type { WorkerListFilter } from "@/features/workers/types/workers.types";

export const workerKeys = {
  all: (organizationId: string) => ["workers", organizationId] as const,
  list: (organizationId: string, query?: WorkerListFilter) =>
    ["workers", organizationId, "list", query ?? {}] as const,
  detail: (organizationId: string, workerId: string) =>
    ["workers", organizationId, workerId] as const,
  roster: (organizationId: string, projectId: string, query?: WorkerListFilter) =>
    ["workers", organizationId, projectId, "roster", query ?? {}] as const,
};

export function useWorkers(organizationId: string | null, query?: WorkerListFilter) {
  return useQuery({
    queryKey: workerKeys.list(organizationId ?? "none", query),
    queryFn: () => workersService.workers(organizationId!, query),
    enabled: Boolean(organizationId),
  });
}

export function useWorker(organizationId: string | null, workerId: string) {
  return useQuery({
    queryKey: workerKeys.detail(organizationId ?? "none", workerId),
    queryFn: () => workersService.worker(organizationId!, workerId),
    enabled: Boolean(organizationId && workerId),
  });
}

export function useProjectWorkers(
  organizationId: string | null,
  projectId: string,
  query?: WorkerListFilter,
) {
  return useQuery({
    queryKey: workerKeys.roster(organizationId ?? "none", projectId, query),
    queryFn: () => workersService.projectRoster(organizationId!, projectId, query),
    enabled: Boolean(organizationId && projectId),
  });
}

export function useCreateWorker(organizationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof workersService.createWorker>[1]) =>
      workersService.createWorker(organizationId!, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workerKeys.all(organizationId ?? "none") }),
  });
}

export function useUpdateWorker(organizationId: string | null, workerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof workersService.updateWorker>[2]) =>
      workersService.updateWorker(organizationId!, workerId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workerKeys.all(organizationId ?? "none") });
      void queryClient.invalidateQueries({
        queryKey: workerKeys.detail(organizationId ?? "none", workerId),
      });
    },
  });
}

export function useDeactivateWorker(organizationId: string | null, workerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string | null) =>
      workersService.deactivateWorker(organizationId!, workerId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workerKeys.all(organizationId ?? "none") });
      void queryClient.invalidateQueries({
        queryKey: workerKeys.detail(organizationId ?? "none", workerId),
      });
    },
  });
}

export function useAssignWorker(organizationId: string | null, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workerId,
      input,
    }: {
      workerId: string;
      input: Parameters<typeof workersService.assignWorker>[3];
    }) => workersService.assignWorker(organizationId!, projectId, workerId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: workerKeys.all(organizationId ?? "none"),
      }),
  });
}

export function useUpdateWorkerAssignment(
  organizationId: string | null,
  projectId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workerId,
      input,
    }: {
      workerId: string;
      input: Parameters<typeof workersService.updateAssignment>[3];
    }) =>
      workersService.updateAssignment(
        organizationId!,
        projectId,
        workerId,
        input,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: workerKeys.all(organizationId ?? "none"),
      }),
  });
}

export function useEndWorkerAssignment(
  organizationId: string | null,
  projectId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workerId,
      input,
    }: {
      workerId: string;
      input: Parameters<typeof workersService.endAssignment>[3];
    }) =>
      workersService.endAssignment(
        organizationId!,
        projectId,
        workerId,
        input,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: workerKeys.all(organizationId ?? "none"),
      }),
  });
}

export function useUpdateWorkerRate(
  organizationId: string | null,
  projectId: string,
  workerId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof workersService.updateRate>[3]) =>
      workersService.updateRate(organizationId!, projectId, workerId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workerKeys.all(organizationId ?? "none") }),
  });
}
