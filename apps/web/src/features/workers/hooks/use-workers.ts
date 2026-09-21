"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { workersService } from "@/features/workers/services/workers.service";
import type { CreateWorkerPrimaryProjectPeriodInput, UpdateWorkerPrimaryProjectPeriodInput, WorkerListFilter } from "@/features/workers/types/workers.types";

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
  const { user } = useAuth();
  return useQuery({
    queryKey: [...workerKeys.list(organizationId ?? "none", query), user?.id],
    queryFn: () => workersService.workers(organizationId!, query),
    enabled: Boolean(organizationId),
  });
}

export function useWorker(organizationId: string | null, workerId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...workerKeys.detail(organizationId ?? "none", workerId), user?.id],
    queryFn: () => workersService.worker(organizationId!, workerId),
    enabled: Boolean(organizationId && workerId),
  });
}

export function useProjectWorkers(
  organizationId: string | null,
  projectId: string,
  query?: WorkerListFilter,
) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...workerKeys.roster(organizationId ?? "none", projectId, query), user?.id],
    queryFn: async () => {
      const first = await workersService.projectRoster(organizationId!, projectId, { ...query, page: 1 });
      const data = [...first.data];
      // Assignment status must not depend on whether the worker falls in page one.
      for (let page = 2; page <= first.meta.pageCount; page += 1) {
        const next = await workersService.projectRoster(organizationId!, projectId, { ...query, page });
        data.push(...next.data);
      }
      return { ...first, data };
    },
    enabled: Boolean(organizationId && projectId),
  });
}

export function useCreateWorker(organizationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof workersService.createWorker>[1]) =>
      workersService.createWorker(organizationId!, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workerKeys.all(organizationId ?? "none") });
      void queryClient.invalidateQueries({ queryKey: ["wages", organizationId] });
    },
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

export function useDeleteWorker(organizationId: string | null, workerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => workersService.deleteWorker(organizationId!, workerId),
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: workerKeys.detail(organizationId ?? "none", workerId),
      });
      void queryClient.invalidateQueries({
        queryKey: workerKeys.all(organizationId ?? "none"),
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workerKeys.all(organizationId ?? "none") });
      void queryClient.invalidateQueries({ queryKey: ["attendance", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["wages", organizationId] });
    },
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workerKeys.all(organizationId ?? "none") });
      void queryClient.invalidateQueries({ queryKey: ["attendance", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["wages", organizationId] });
    },
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workerKeys.all(organizationId ?? "none") });
      void queryClient.invalidateQueries({ queryKey: ["attendance", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["wages", organizationId] });
    },
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workerKeys.all(organizationId ?? "none") });
      void queryClient.invalidateQueries({ queryKey: ["wages", organizationId] });
    },
  });
}

export function useWorkerPrimaryPeriods(organizationId: string | null, workerId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...workerKeys.detail(organizationId ?? "none", workerId), "primary-periods", user?.id],
    queryFn: () => workersService.primaryPeriods(organizationId!, workerId),
    enabled: Boolean(organizationId && workerId),
  });
}

export function useSaveWorkerPrimaryPeriod(organizationId: string, workerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async (action:
      | { kind: "create"; input: CreateWorkerPrimaryProjectPeriodInput }
      | { kind: "transfer"; input: CreateWorkerPrimaryProjectPeriodInput; permittedProjectIds: string[] }
      | { kind: "correct"; periodId: string; input: UpdateWorkerPrimaryProjectPeriodInput }
      | { kind: "end"; periodId: string; input: { endsOn: string } }
    ) => {
      if (action.kind === "transfer") {
        // Re-read before a multi-request transfer; a failed second request must not
        // imply that the first request was rolled back. Never automatically retry.
        const periods = await workersService.primaryPeriods(organizationId, workerId);
        const date = action.input.startsOn;
        const source = periods.find(period => period.startsOn.slice(0, 10) <= date && (!period.endsOn || period.endsOn.slice(0, 10) >= date));
        if (source?.workerAssignmentId === action.input.workerAssignmentId) throw new Error("This project is already primary on the effective date. Refresh history to see the current allocation.");
        if (source && !action.permittedProjectIds.includes(source.projectId)) throw new Error("You need assignment permission on the current primary project to transfer this worker.");
        const previousDate = (value: string) => {
          const dateOnly = new Date(`${value.slice(0, 10)}T12:00:00Z`);
          dateOnly.setUTCDate(dateOnly.getUTCDate() - 1);
          return dateOnly.toISOString().slice(0, 10);
        };
        const next = periods.filter(period => period.startsOn.slice(0, 10) > date).sort((a, b) => a.startsOn.localeCompare(b.startsOn))[0];
        const ends = [action.input.endsOn, source?.endsOn?.slice(0, 10), next ? previousDate(next.startsOn) : null].filter((value): value is string => Boolean(value)).sort();
        const input = { ...action.input, endsOn: ends[0] ?? null };
        if (source?.startsOn.slice(0, 10) === date) return workersService.updatePrimaryPeriod(organizationId, workerId, source.id, input);
        if (source) await workersService.endPrimaryPeriod(organizationId, workerId, source.id, { endsOn: previousDate(date) });
        try { return await workersService.createPrimaryPeriod(organizationId, workerId, input); }
        catch (failure) {
          throw new Error(`${source ? "The previous period was ended, but the new allocation was not confirmed. " : "The allocation was not confirmed. "}Refresh history before retrying. ${failure instanceof Error ? failure.message : "Request failed."}`);
        }
      }
      return action.kind === "create"
        ? workersService.createPrimaryPeriod(organizationId, workerId, action.input)
        : action.kind === "correct"
          ? workersService.updatePrimaryPeriod(organizationId, workerId, action.periodId, action.input)
          : workersService.endPrimaryPeriod(organizationId, workerId, action.periodId, action.input);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: workerKeys.all(organizationId) });
      void queryClient.invalidateQueries({ queryKey: ["attendance", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["wages", organizationId] });
    },
  });
}
