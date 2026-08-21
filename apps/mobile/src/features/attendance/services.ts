import type {
  AttendanceRecord,
  AttendanceEntryInput,
} from "@nirman-app/shared";

import { appConfig } from "../../config";
import { ApiRequestError, apiRequest } from "../../lib/api";
import type { ProjectWorkerRosterResponse } from "../workers/types";

type ApiEnvelope<TData> = {
  success: boolean;
  data: TData;
};

export async function fetchAttendance(
  organizationId: string,
  projectId: string,
  date: string,
  accessToken: string,
) {
  const response = await apiRequest<ApiEnvelope<AttendanceRecord[]>>(
    `/organizations/${organizationId}/projects/${projectId}/attendance?date=${encodeURIComponent(date)}`,
    {},
    { accessToken },
  );
  return response.data;
}

export async function saveAttendance(
  organizationId: string,
  projectId: string,
  date: string,
  entries: AttendanceEntryInput[],
  accessToken: string,
) {
  const response = await apiRequest<
    ApiEnvelope<{ date: string; data: AttendanceRecord[] }>
  >(
    `/organizations/${organizationId}/projects/${projectId}/attendance`,
    { method: "POST", body: JSON.stringify({ date, entries }) },
    { accessToken },
  );
  return response.data;
}

export async function exportAttendanceCsv(
  organizationId: string,
  projectId: string,
  date: string,
  accessToken: string,
) {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/organizations/${organizationId}/projects/${projectId}/attendance/export?date=${encodeURIComponent(date)}`,
    {
      headers: {
        Accept: "text/csv",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new ApiRequestError(
      `Attendance export failed with ${response.status}`,
      response.status,
    );
  }

  return response.text();
}

export async function fetchAttendanceRoster(
  organizationId: string,
  projectId: string,
  accessToken: string,
) {
  const [attendance, roster] = await Promise.all([
    fetchAttendance(
      organizationId,
      projectId,
      new Date().toISOString().slice(0, 10),
      accessToken,
    ),
    apiRequest<ApiEnvelope<ProjectWorkerRosterResponse>>(
      `/organizations/${organizationId}/projects/${projectId}/workers?pageSize=100&assignmentScope=ALL_ACTIVE&sortBy=name&sortOrder=asc`,
      {},
      { accessToken },
    ),
  ]);
  return { attendance, roster: roster.data };
}
