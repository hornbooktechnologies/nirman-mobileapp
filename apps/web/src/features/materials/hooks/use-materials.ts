"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { materialKey } from "../material-rules";
import {
  materialsService,
  type MaterialWrite,
} from "../services/materials.service";
import type { MaterialsQuery } from "../types/materials.types";
export function useMaterials(o: string, p: string, query: MaterialsQuery) {
  return useQuery({
    queryKey: [...materialKey(o, p), "list", query],
    queryFn: ({ signal }) => materialsService.list(o, p, query, signal),
  });
}
export function useMaterialSummary(
  o: string,
  p: string,
  query: MaterialsQuery,
) {
  return useQuery({
    queryKey: [...materialKey(o, p), "summary", query],
    queryFn: ({ signal }) => materialsService.summary(o, p, query, signal),
  });
}
export function useMaterialSettings(o: string, p: string) {
  return useQuery({
    queryKey: [...materialKey(o, p), "settings"],
    queryFn: ({ signal }) => materialsService.settings(o, p, signal),
  });
}
export function useMaterialDetail(o: string, p: string, id: string) {
  return useQuery({
    queryKey: [...materialKey(o, p), "detail", id],
    queryFn: ({ signal }) => materialsService.detail(o, p, id, signal),
  });
}
export function useMaterialWrite(o: string, p: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (command: MaterialWrite) =>
      materialsService.write(o, p, command),
    retry: false,
    onSuccess: (record) => {
      cache.setQueryData([...materialKey(o, p), "detail", record.id], record);
      void cache.invalidateQueries({ queryKey: materialKey(o, p) });
    },
  });
}
