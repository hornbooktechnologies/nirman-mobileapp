import type {
  ProjectProgressHistoryResponse,
  ProjectProgressPortfolioItem,
  ProjectProgressSummary,
} from '@nirman-app/shared';

import { appConfig } from '../../config';
import { ApiRequestError, apiRequest } from '../../lib/api';
import type { ProgressHistoryQuery, RecordProgressInput } from './types';

type ApiEnvelope<T> = { success: boolean; data: T };

const base = (organizationId: string, projectId: string) =>
  `/organizations/${organizationId}/projects/${projectId}/progress`;

function queryString(query: ProgressHistoryQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `?${text}` : '';
}

async function data<T>(path: string, accessToken: string, init: RequestInit = {}) {
  const response = await apiRequest<ApiEnvelope<T>>(path, init, { accessToken });
  return response.data;
}

export const fetchProgressSummary = (organizationId: string, projectId: string, token: string) =>
  data<ProjectProgressSummary>(`${base(organizationId, projectId)}/summary`, token);

export const fetchProgressHistory = (organizationId: string, projectId: string, token: string, query: ProgressHistoryQuery = {}) =>
  data<ProjectProgressHistoryResponse>(`${base(organizationId, projectId)}/history${queryString(query)}`, token);

export const recordProgressUpdate = (organizationId: string, projectId: string, token: string, input: RecordProgressInput) =>
  data<ProjectProgressSummary>(`${base(organizationId, projectId)}/updates`, token, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const fetchProgressPortfolio = (organizationId: string, token: string) =>
  data<ProjectProgressPortfolioItem[]>(`/organizations/${organizationId}/progress/projects`, token);

export async function exportProgressCsv(
  organizationId: string,
  projectId: string,
  token: string,
  query: ProgressHistoryQuery = {},
) {
  const response = await fetch(
    `${appConfig.apiBaseUrl}${base(organizationId, projectId)}/export${queryString(query)}`,
    { headers: { Accept: 'text/csv', Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    let body: { code?: string; message?: string } | null = null;
    try { body = await response.json(); } catch { body = null; }
    throw new ApiRequestError(body?.message ?? `Progress export failed with ${response.status}`, response.status, body?.code);
  }
  return { csv: await response.text(), filename: response.headers.get('content-disposition') ?? 'project-progress.csv' };
}
