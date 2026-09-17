"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { wagesService } from "@/features/wages/services/wages.service";

export const wageKeys = {
  batches: (organizationId: string, projectId: string) =>
    ["wages", organizationId, projectId, "batches"] as const,
  detail: (organizationId: string, projectId: string, batchId: string) =>
    ["wages", organizationId, projectId, "batches", batchId] as const,
  preview: (organizationId: string, projectId: string, start: string, end: string) =>
    ["wages", organizationId, projectId, "preview", start, end] as const,
};

export function useCancelWageBatch(organizationId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: ({ batchId, reason }: { batchId: string; reason: string }) =>
      wagesService.cancelBatch(organizationId, projectId, batchId, reason),
    onSuccess: (detail) => {
      queryClient.setQueryData(wageKeys.detail(organizationId, projectId, detail.id), detail);
      void queryClient.invalidateQueries({ queryKey: ["wages", organizationId, projectId] });
      void queryClient.invalidateQueries({ queryKey: ["wage-kharchi", organizationId, projectId] });
    },
  });
}

export function useWagePreview(
  organizationId: string | null,
  projectId: string,
  start: string,
  end: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: wageKeys.preview(organizationId ?? "none", projectId, start, end),
    queryFn: () => wagesService.preview(organizationId!, projectId, start, end),
    enabled: Boolean(enabled && organizationId && projectId && start && end),
  });
}

export function useWageBatches(organizationId: string | null, projectId: string) {
  return useQuery({
    queryKey: wageKeys.batches(organizationId ?? "none", projectId),
    queryFn: () => wagesService.batches(organizationId!, projectId),
    enabled: Boolean(organizationId && projectId),
  });
}

export function useWageBatchDetail(
  organizationId: string | null,
  projectId: string,
  batchId: string | null,
) {
  return useQuery({
    queryKey: wageKeys.detail(organizationId ?? "none", projectId, batchId ?? "none"),
    queryFn: () => wagesService.batchDetail(organizationId!, projectId, batchId!),
    enabled: Boolean(organizationId && projectId && batchId),
  });
}

export function useCreateWageBatch(organizationId: string | null, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { periodStart: string; periodEnd: string }) =>
      wagesService.createBatch(organizationId!, projectId, input),
    onSuccess: (detail) => {
      queryClient.setQueryData(wageKeys.detail(organizationId!, projectId, detail.id), detail);
      void queryClient.invalidateQueries({ queryKey: ["wages", organizationId, projectId] });
      void queryClient.invalidateQueries({ queryKey: ["wage-kharchi", organizationId, projectId] });
    },
  });
}

export function useRecordWagePayment(organizationId: string | null, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof wagesService.recordPayment>[3] & { wageItemId: string }) => {
      const { wageItemId, ...body } = input;
      return wagesService.recordPayment(organizationId!, projectId, wageItemId, body);
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(wageKeys.detail(organizationId!, projectId, detail.id), detail);
      void queryClient.invalidateQueries({
        queryKey: wageKeys.batches(organizationId ?? "none", projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: ["wages", organizationId ?? "none", projectId, "batches"],
      });
    },
  });
}

export function useUpdateWageItem(organizationId: string | null, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof wagesService.updateItem>[3] & { wageItemId: string }) => {
      const { wageItemId, ...body } = input;
      return wagesService.updateItem(organizationId!, projectId, wageItemId, body);
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(wageKeys.detail(organizationId!, projectId, detail.id), detail);
      void queryClient.invalidateQueries({
        queryKey: ["wages", organizationId ?? "none", projectId, "batches"],
      });
    },
  });
}
