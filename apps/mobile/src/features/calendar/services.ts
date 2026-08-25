import type {
  CreateWorkCalendarOverrideInput,
  EffectiveProjectWorkCalendarResponse,
  OrganizationWorkCalendar,
  UpdateOrganizationWorkCalendarInput,
  UpdateWorkCalendarOverrideInput,
  WorkCalendarOverride,
} from '@nirman-app/shared';

import { apiRequest } from '../../lib/api';

export type CalendarScope = 'ORGANIZATION' | 'PROJECT';
type ApiEnvelope<TData> = { success: boolean; data: TData };

function organizationPath(organizationId: string) {
  return `/organizations/${organizationId}/work-calendar`;
}

function projectPath(organizationId: string, projectId: string) {
  return `/organizations/${organizationId}/projects/${projectId}/work-calendar`;
}

function scopePath(organizationId: string, projectId: string, scope: CalendarScope) {
  return scope === 'PROJECT' ? projectPath(organizationId, projectId) : organizationPath(organizationId);
}

export async function fetchOrganizationCalendar(organizationId: string, accessToken: string) {
  const response = await apiRequest<ApiEnvelope<OrganizationWorkCalendar>>(
    organizationPath(organizationId), {}, { accessToken },
  );
  return response.data;
}

export async function updateOrganizationCalendar(
  organizationId: string,
  input: UpdateOrganizationWorkCalendarInput,
  accessToken: string,
) {
  const response = await apiRequest<ApiEnvelope<OrganizationWorkCalendar>>(
    organizationPath(organizationId),
    { method: 'PATCH', body: JSON.stringify(input) },
    { accessToken },
  );
  return response.data;
}

export async function fetchProjectCalendar(
  organizationId: string,
  projectId: string,
  startDate: string,
  endDate: string,
  accessToken: string,
) {
  const params = new URLSearchParams({ startDate, endDate });
  const response = await apiRequest<ApiEnvelope<EffectiveProjectWorkCalendarResponse>>(
    `${projectPath(organizationId, projectId)}?${params.toString()}`,
    {},
    { accessToken },
  );
  return response.data;
}

export async function createCalendarOverride(
  organizationId: string,
  projectId: string,
  scope: CalendarScope,
  input: CreateWorkCalendarOverrideInput,
  accessToken: string,
) {
  const response = await apiRequest<ApiEnvelope<WorkCalendarOverride>>(
    `${scopePath(organizationId, projectId, scope)}/overrides`,
    { method: 'POST', body: JSON.stringify(input) },
    { accessToken },
  );
  return response.data;
}

export async function updateCalendarOverride(
  organizationId: string,
  projectId: string,
  scope: CalendarScope,
  overrideId: string,
  input: UpdateWorkCalendarOverrideInput,
  accessToken: string,
) {
  const response = await apiRequest<ApiEnvelope<WorkCalendarOverride>>(
    `${scopePath(organizationId, projectId, scope)}/overrides/${overrideId}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    { accessToken },
  );
  return response.data;
}

export async function removeCalendarOverride(
  organizationId: string,
  projectId: string,
  scope: CalendarScope,
  overrideId: string,
  accessToken: string,
) {
  const response = await apiRequest<ApiEnvelope<{ id: string; removed: true }>>(
    `${scopePath(organizationId, projectId, scope)}/overrides/${overrideId}`,
    { method: 'DELETE' },
    { accessToken },
  );
  return response.data;
}
