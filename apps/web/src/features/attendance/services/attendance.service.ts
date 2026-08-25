import { api, apiClient } from "@/lib/api/api-client";
import type { AttendanceException, AttendanceSummaryQuery, AttendanceSummaryResponse, CreateAttendanceExceptionInput, UpdateAttendanceExceptionInput, WorkerAttendancePeriodResponse } from "@nirman-app/shared";

function basePath(organizationId: string, projectId: string) {
  return `/organizations/${organizationId}/projects/${projectId}/attendance`;
}

export const attendanceService = {
  summary(organizationId: string, projectId: string, query: AttendanceSummaryQuery) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== "") params.set(key, String(value));
    });
    return api.get<AttendanceSummaryResponse>(`${basePath(organizationId, projectId)}/summary?${params}`);
  },
  workerPeriod(organizationId: string, projectId: string, workerId: string, startDate: string, endDate: string) {
    const params = new URLSearchParams({ startDate, endDate });
    return api.get<WorkerAttendancePeriodResponse>(`${basePath(organizationId, projectId)}/workers/${workerId}?${params}`);
  },
  createException(organizationId: string, projectId: string, input: CreateAttendanceExceptionInput) {
    return api.post<AttendanceException, CreateAttendanceExceptionInput>(`${basePath(organizationId, projectId)}/exceptions`, input);
  },
  updateException(organizationId: string, projectId: string, exceptionId: string, input: UpdateAttendanceExceptionInput) {
    return api.patch<AttendanceException, UpdateAttendanceExceptionInput>(`${basePath(organizationId, projectId)}/exceptions/${exceptionId}`, input);
  },
  removeException(organizationId: string, projectId: string, exceptionId: string) {
    return api.delete<{ id: string; removed: true; restoredState: "PRESENT" }>(`${basePath(organizationId, projectId)}/exceptions/${exceptionId}`);
  },
  async exportCsv(organizationId: string, projectId: string, startDate: string, endDate: string) {
    const params = new URLSearchParams({ startDate, endDate });
    const response = await apiClient.get<string>(
      `${basePath(organizationId, projectId)}/export?${params}`,
      { responseType: "text" },
    );
    return response.data;
  },
};
