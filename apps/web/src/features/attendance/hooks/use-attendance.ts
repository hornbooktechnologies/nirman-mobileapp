"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attendanceService } from "@/features/attendance/services/attendance.service";

export const attendanceKeys = {
  date: (organizationId: string, projectId: string, date: string) =>
    ["attendance", organizationId, projectId, date] as const,
};

export function useAttendance(organizationId: string | null, projectId: string, date: string) {
  return useQuery({
    queryKey: attendanceKeys.date(organizationId ?? "none", projectId, date),
    queryFn: () => attendanceService.list(organizationId!, projectId, date),
    enabled: Boolean(organizationId && projectId && date),
  });
}

export function useSaveAttendance(organizationId: string | null, projectId: string, date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entries: Parameters<typeof attendanceService.save>[2]["entries"]) =>
      attendanceService.save(organizationId!, projectId, { date, entries }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: attendanceKeys.date(organizationId ?? "none", projectId, date),
      }),
  });
}
