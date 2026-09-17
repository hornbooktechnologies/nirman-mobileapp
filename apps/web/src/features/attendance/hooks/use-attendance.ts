"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AttendanceSummaryQuery, CreateAttendanceExceptionInput, UpdateAttendanceExceptionInput } from "@nirman-app/shared";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { periodError } from "../date-utils";
import { attendanceService } from "@/features/attendance/services/attendance.service";

export const attendanceKeys = {
  all: (organizationId: string, projectId: string) => ["attendance", organizationId, projectId] as const,
  summary: (organizationId: string, projectId: string, query: AttendanceSummaryQuery) =>
    [...attendanceKeys.all(organizationId, projectId), "summary", query] as const,
  workerPeriod: (organizationId: string, projectId: string, workerId: string, startDate: string, endDate: string) =>
    [...attendanceKeys.all(organizationId, projectId), "worker", workerId, startDate, endDate] as const,
};

export function useAttendanceSummary(organizationId: string | null, projectId: string, query: AttendanceSummaryQuery, enabled = true) {
  const { user } = useAuth();
  return useQuery({ refetchOnWindowFocus: true,
    queryKey: [...attendanceKeys.summary(organizationId ?? "none", projectId, query), user?.id],
    queryFn: () => attendanceService.summary(organizationId!, projectId, query),
    enabled: enabled && Boolean(organizationId && projectId) && !periodError(query.startDate, query.endDate),
  });
}

export function useWorkerAttendancePeriod(organizationId: string | null, projectId: string, workerId: string, startDate: string, endDate: string, enabled = true) {
  const { user } = useAuth();
  return useQuery({ refetchOnWindowFocus: true,
    queryKey: [...attendanceKeys.workerPeriod(organizationId ?? "none", projectId, workerId, startDate, endDate), user?.id],
    queryFn: () => attendanceService.workerPeriod(organizationId!, projectId, workerId, startDate, endDate),
    enabled: enabled && Boolean(organizationId && projectId && workerId) && !periodError(startDate, endDate),
  });
}

function useInvalidator(organizationId: string | null, projectId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: attendanceKeys.all(organizationId ?? "none", projectId) });
}

export function useCreateAttendanceException(organizationId: string | null, projectId: string) {
  const invalidate = useInvalidator(organizationId, projectId);
  return useMutation({ retry: false, mutationFn: (input: CreateAttendanceExceptionInput) => attendanceService.createException(organizationId!, projectId, input), onSuccess: invalidate });
}

export function useUpdateAttendanceException(organizationId: string | null, projectId: string) {
  const invalidate = useInvalidator(organizationId, projectId);
  return useMutation({ retry: false, mutationFn: ({ exceptionId, input }: { exceptionId: string; input: UpdateAttendanceExceptionInput }) => attendanceService.updateException(organizationId!, projectId, exceptionId, input), onSuccess: invalidate });
}

export function useRemoveAttendanceException(organizationId: string | null, projectId: string) {
  const invalidate = useInvalidator(organizationId, projectId);
  return useMutation({ retry: false, mutationFn: (exceptionId: string) => attendanceService.removeException(organizationId!, projectId, exceptionId), onSuccess: invalidate });
}
