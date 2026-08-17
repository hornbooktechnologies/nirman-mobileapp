import { apiRequest } from '../../lib/api';
import type { Project, ProjectInput } from './types';

type ApiEnvelope<TData> = { success: boolean; data: TData };

async function requestData<TData>(path: string, accessToken: string, init: RequestInit = {}) {
  const response = await apiRequest<ApiEnvelope<TData>>(path, init, { accessToken });
  return response.data;
}

export function fetchProject(organizationId: string, projectId: string, accessToken: string) {
  return requestData<Project>(`/organizations/${organizationId}/projects/${projectId}`, accessToken);
}

export function createProject(organizationId: string, accessToken: string, input: ProjectInput) {
  return requestData<Project>(`/organizations/${organizationId}/projects`, accessToken, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateProject(organizationId: string, projectId: string, accessToken: string, input: ProjectInput) {
  return requestData<Project>(`/organizations/${organizationId}/projects/${projectId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
