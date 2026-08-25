import type {
  AttendanceException,
  AttendanceSummaryQuery,
  AttendanceSummaryResponse,
  CreateAttendanceExceptionInput,
  UpdateAttendanceExceptionInput,
  WorkerAttendancePeriodResponse,
} from '@nirman-app/shared';

import { apiRequest } from '../../lib/api';

type ApiEnvelope<TData> = { success: boolean; data: TData };

function attendancePath(organizationId: string, projectId: string) {
  return `/organizations/${organizationId}/projects/${projectId}/attendance`;
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
