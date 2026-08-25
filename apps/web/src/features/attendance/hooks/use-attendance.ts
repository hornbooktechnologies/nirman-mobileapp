"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AttendanceSummaryQuery, CreateAttendanceExceptionInput, UpdateAttendanceExceptionInput } from "@nirman-app/shared";
import { attendanceService } from "@/features/attendance/services/attendance.service";

export const attendanceKeys = {
  all: (organizationId: string, projectId: string) => ["attendance", organizationId, projectId] as const,
  summary: (organizationId: string, projectId: string, query: AttendanceSummaryQuery) =>
    [...attendanceKeys.all(organizationId, projectId), "summary", query] as const,
  workerPeriod: (organizationId: string, projectId: string, workerId: string, startDate: string, endDate: string) =>
    [...attendanceKeys.all(organizationId, projectId), "worker", workerId, startDate, endDate] as const,
};

export function useAttendanceSummary(organizationId: string | null, projectId: string, query: AttendanceSummaryQuery) {
  return useQuery({
    queryKey: attendanceKeys.summary(organizationId ?? "none", projectId, query),
    queryFn: () => attendanceService.summary(organizationId!, projectId, query),
    enabled: Boolean(organizationId && projectId && query.startDate && query.endDate),
    placeholderData: (previous) => previous,
  });
}

export function useWorkerAttendancePeriod(organizationId: string | null, projectId: string, workerId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: attendanceKeys.workerPeriod(organizationId ?? "none", projectId, workerId, startDate, endDate),
    queryFn: () => attendanceService.workerPeriod(organizationId!, projectId, workerId, startDate, endDate),
    enabled: Boolean(organizationId && projectId && workerId && startDate && endDate),
    placeholderData: (previous) => previous,
  });
}

function useInvalidator(organizationId: string | null, projectId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: attendanceKeys.all(organizationId ?? "none", projectId) });
}

export function useCreateAttendanceException(organizationId: string | null, projectId: string) {
  const invalidate = useInvalidator(organizationId, projectId);
  return useMutation({ mutationFn: (input: CreateAttendanceExceptionInput) => attendanceService.createException(organizationId!, projectId, input), onSuccess: invalidate });
}

export function useUpdateAttendanceException(organizationId: string | null, projectId: string) {
  const invalidate = useInvalidator(organizationId, projectId);
  return useMutation({ mutationFn: ({ exceptionId, input }: { exceptionId: string; input: UpdateAttendanceExceptionInput }) => attendanceService.updateException(organizationId!, projectId, exceptionId, input), onSuccess: invalidate });
}

export function useRemoveAttendanceException(organizationId: string | null, projectId: string) {
  const invalidate = useInvalidator(organizationId, projectId);
  return useMutation({ mutationFn: (exceptionId: string) => attendanceService.removeException(organizationId!, projectId, exceptionId), onSuccess: invalidate });
}
