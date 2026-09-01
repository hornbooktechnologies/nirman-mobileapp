import type {
  KharchiAdvanceDetail,
  KharchiListResponse,
  KharchiSummary,
  ProjectWorkerRosterResponse,
} from '@nirman-app/shared';

import { appConfig } from '../../config';
import { ApiRequestError, apiRequest } from '../../lib/api';
import type { CreateKharchiAdjustmentInput, CreateKharchiInput, KharchiQuery } from './types';

type ApiEnvelope<TData> = { success: boolean; data: TData };

function basePath(organizationId: string, projectId: string) {
  return `/organizations/${organizationId}/projects/${projectId}/kharchi`;
}

function queryString(query: KharchiQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const value = params.toString();
  return value ? `?${value}` : '';
}

export async function fetchKharchiList(organizationId: string, projectId: string, accessToken: string, query: KharchiQuery = {}) {
  const response = await apiRequest<ApiEnvelope<KharchiListResponse>>(
    `${basePath(organizationId, projectId)}${queryString(query)}`,
    {},
    { accessToken },
  );
  return response.data;
}

export async function fetchKharchiSummary(organizationId: string, projectId: string, accessToken: string, query: Pick<KharchiQuery, 'workerId' | 'workerAssignmentId' | 'startDate' | 'endDate'> = {}) {
  const response = await apiRequest<ApiEnvelope<KharchiSummary>>(
    `${basePath(organizationId, projectId)}/summary${queryString(query)}`,
    {},
    { accessToken },
  );
  return response.data;
}

export async function fetchKharchiDetail(organizationId: string, projectId: string, kharchiId: string, accessToken: string) {
  const response = await apiRequest<ApiEnvelope<KharchiAdvanceDetail>>(
    `${basePath(organizationId, projectId)}/${kharchiId}`,
    {},
    { accessToken },
  );
  return response.data;
}

export async function createKharchi(organizationId: string, projectId: string, accessToken: string, input: CreateKharchiInput) {
  const response = await apiRequest<ApiEnvelope<KharchiAdvanceDetail>>(
    basePath(organizationId, projectId),
    { method: 'POST', body: JSON.stringify(input) },
    { accessToken },
  );
  return response.data;
}

export async function createKharchiAdjustment(organizationId: string, projectId: string, kharchiId: string, accessToken: string, input: CreateKharchiAdjustmentInput) {
  const response = await apiRequest<ApiEnvelope<KharchiAdvanceDetail>>(
    `${basePath(organizationId, projectId)}/${kharchiId}/adjustments`,
    { method: 'POST', body: JSON.stringify(input) },
    { accessToken },
  );
  return response.data;
}

export async function fetchEligibleKharchiWorkers(organizationId: string, projectId: string, requestDate: string, accessToken: string) {
  const params = new URLSearchParams({ date: requestDate, assignmentScope: 'CURRENT', status: 'ACTIVE', pageSize: '100', sortBy: 'name', sortOrder: 'asc' });
  const response = await apiRequest<ApiEnvelope<ProjectWorkerRosterResponse>>(
    `/organizations/${organizationId}/projects/${projectId}/workers?${params.toString()}`,
    {},
    { accessToken },
  );
  return response.data;
}

export async function exportKharchiCsv(organizationId: string, projectId: string, accessToken: string, query: KharchiQuery = {}) {
  const response = await fetch(`${appConfig.apiBaseUrl}${basePath(organizationId, projectId)}/export${queryString(query)}`, {
    headers: { Accept: 'text/csv', Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new ApiRequestError(`Kharchi export failed with ${response.status}`, response.status);
  return { csv: await response.text(), filename: response.headers.get('content-disposition') ?? 'kharchi.csv' };
}
