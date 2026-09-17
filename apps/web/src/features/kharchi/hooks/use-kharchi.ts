"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kharchiKey } from "../kharchi-rules";
import { kharchiService, type KharchiQuery, type AdvanceInput, type AdjustmentInput } from "../services/kharchi.service";

export function useKharchiList(org: string, project: string, query: KharchiQuery) {
  return useQuery({ queryKey: [...kharchiKey(org, project), "list", query], queryFn: () => kharchiService.list(org, project, query) });
}
export function useKharchiSummary(org: string, project: string, query: KharchiQuery) {
  const { workerId, workerAssignmentId, startDate, endDate } = query;
  const filters = { workerId, workerAssignmentId, startDate, endDate };
  return useQuery({ queryKey: [...kharchiKey(org, project), "summary", filters], queryFn: () => kharchiService.summary(org, project, filters) });
}
export function useKharchiDetail(org: string, project: string, id: string) {
  return useQuery({ queryKey: [...kharchiKey(org, project), "detail", id], queryFn: () => kharchiService.detail(org, project, id) });
}
export function useKharchiWrite(org: string, project: string, id?: string) {
  const cache = useQueryClient();
  return useMutation({ retry: false,
    mutationFn: (input: (AdvanceInput | AdjustmentInput) & { idempotencyKey: string }) => id
      ? kharchiService.adjust(org, project, id, input as AdjustmentInput & { idempotencyKey: string })
      : kharchiService.create(org, project, input as AdvanceInput & { idempotencyKey: string }),
    onSuccess: () => { void cache.invalidateQueries({ queryKey: kharchiKey(org, project) }); void cache.invalidateQueries({ queryKey: ["wages", org, project] }); },
  });
}
