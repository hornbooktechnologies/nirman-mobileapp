import { api, apiClient } from "@/lib/api/api-client";
import type {
  AttendanceEntryInput,
  AttendanceRecord,
} from "@/features/attendance/types/attendance.types";

export const attendanceService = {
  list(organizationId: string, projectId: string, date: string) {
    return api.get<AttendanceRecord[]>(
      `/organizations/${organizationId}/projects/${projectId}/attendance?date=${encodeURIComponent(date)}`,
    );
  },
  save(
    organizationId: string,
    projectId: string,
    input: { date: string; entries: AttendanceEntryInput[] },
  ) {
    return api.post<{ date: string; data: AttendanceRecord[] }, typeof input>(
      `/organizations/${organizationId}/projects/${projectId}/attendance`,
      input,
    );
  },
  async exportCsv(organizationId: string, projectId: string, date: string) {
    const response = await apiClient.get<string>(
      `/organizations/${organizationId}/projects/${projectId}/attendance/export?date=${encodeURIComponent(date)}`,
      { responseType: "text" },
    );
    return response.data;
  },
};
