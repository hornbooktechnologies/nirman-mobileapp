import { requestPdf } from '../../lib/exports/pdf';
import type {
  AttendanceException,
  AttendanceSummaryQuery,
  AttendanceSummaryResponse,
  CreateAttendanceExceptionInput,
  UpdateAttendanceExceptionInput,
  WorkerAttendancePeriodResponse,
} from '@nirman-app/shared';

import { apiRequest } from '../../lib/api';
import { ApiRequestError } from '../../lib/api';
import { appConfig } from '../../config';

type ApiEnvelope<TData> = { success: boolean; data: TData };

function attendancePath(organizationId: string, projectId: string) {
  return `/organizations/${organizationId}/projects/${projectId}/attendance`;
}

export async function exportAttendanceCsv(organizationId: string, projectId: string, startDate: string, endDate: string, accessToken: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ startDate, endDate });
  const response = await fetch(`${appConfig.apiBaseUrl}${attendancePath(organizationId, projectId)}/export?${params}`, {
    signal,
    headers: { Accept: 'text/csv', Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new ApiRequestError(`Attendance export failed with ${response.status}`, response.status);
  return response.text();
}

export async function fetchAttendanceSummary(
  organizationId: string,
  projectId: string,
  query: AttendanceSummaryQuery,
  accessToken: string,
) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const response = await apiRequest<ApiEnvelope<AttendanceSummaryResponse>>(
    `${attendancePath(organizationId, projectId)}/summary?${params.toString()}`,
    {},
    { accessToken },
  );
  return response.data;
}

export async function fetchWorkerAttendancePeriod(
  organizationId: string,
  projectId: string,
  workerId: string,
  query: { startDate: string; endDate: string },
  accessToken: string,
) {
  const params = new URLSearchParams(query);
  const response = await apiRequest<ApiEnvelope<WorkerAttendancePeriodResponse>>(
    `${attendancePath(organizationId, projectId)}/workers/${workerId}?${params.toString()}`,
    {},
    { accessToken },
  );
  return response.data;
}

export async function createAttendanceException(
  organizationId: string,
  projectId: string,
  input: CreateAttendanceExceptionInput,
  accessToken: string,
) {
  const response = await apiRequest<ApiEnvelope<AttendanceException>>(
    `${attendancePath(organizationId, projectId)}/exceptions`,
    { method: 'POST', body: JSON.stringify(input) },
    { accessToken },
  );
  return response.data;
}

export async function updateAttendanceException(
  organizationId: string,
  projectId: string,
  exceptionId: string,
  input: UpdateAttendanceExceptionInput,
  accessToken: string,
) {
  const response = await apiRequest<ApiEnvelope<AttendanceException>>(
    `${attendancePath(organizationId, projectId)}/exceptions/${exceptionId}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    { accessToken },
  );
  return response.data;
}

export async function removeAttendanceException(
  organizationId: string,
  projectId: string,
  exceptionId: string,
  accessToken: string,
) {
  const response = await apiRequest<ApiEnvelope<{ id: string; removed: true; restoredState: 'PRESENT' }>>(
    `${attendancePath(organizationId, projectId)}/exceptions/${exceptionId}`,
    { method: 'DELETE' },
    { accessToken },
  );
  return response.data;
}

export function exportAttendancePdf(o: string, p: string, startDate: string, endDate: string, token: string, signal?: AbortSignal) {
  return requestPdf(`${attendancePath(o, p)}/export/pdf?${new URLSearchParams({ startDate, endDate })}`, token, signal);
}
