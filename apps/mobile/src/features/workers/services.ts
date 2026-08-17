import { apiRequest } from '../../lib/api';
import type {
  AssignWorkerToProjectInput,
  CreateWorkerInput,
  EndWorkerProjectAssignmentInput,
  ProjectWorkerRosterResponse,
  UpdateWorkerProjectAssignmentInput,
  WorkerDetail,
  WorkerDuplicateCandidate,
  WorkerListResponse,
  WorkerProjectAssignmentSummary,
} from './types';

type ApiEnvelope<TData> = {
  success: boolean;
  data: TData;
};

export async function fetchProjectWorkers(
  organizationId: string,
  projectId: string,
  accessToken: string,
) {
  const response = await apiRequest<ApiEnvelope<ProjectWorkerRosterResponse>>(
    `/organizations/${organizationId}/projects/${projectId}/workers?pageSize=100&assignmentScope=ALL_ACTIVE`,
    {},
    { accessToken },
  );
  return response.data;
}

export async function fetchOrganizationWorkers(
  organizationId: string,
  accessToken: string,
) {
  const response = await apiRequest<ApiEnvelope<WorkerListResponse>>(
    `/organizations/${organizationId}/workers?status=ACTIVE&pageSize=100&sortBy=name&sortOrder=asc`,
    {},
    { accessToken },
  );
  return response.data;
}

export async function fetchWorkerDuplicateCandidates(
  organizationId: string,
  accessToken: string,
  input: { name: string; mobileNumber?: string | null },
) {
  const params = new URLSearchParams();
  if (input.name) params.set('name', input.name);
  if (input.mobileNumber) params.set('mobileNumber', input.mobileNumber);
  const response = await apiRequest<ApiEnvelope<WorkerDuplicateCandidate[]>>(
    `/organizations/${organizationId}/workers/duplicate-candidates?${params.toString()}`,
    {},
    { accessToken },
  );
  return response.data;
}

export async function createWorker(
  organizationId: string,
  accessToken: string,
  input: CreateWorkerInput,
) {
  const response = await apiRequest<ApiEnvelope<WorkerDetail>>(
    `/organizations/${organizationId}/workers`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    { accessToken },
  );
  return response.data;
}

export async function assignWorkerToProject(
  organizationId: string,
  projectId: string,
  workerId: string,
  accessToken: string,
  input: AssignWorkerToProjectInput,
) {
  const response = await apiRequest<ApiEnvelope<WorkerProjectAssignmentSummary>>(
    `/organizations/${organizationId}/projects/${projectId}/workers/${workerId}`,
    { method: 'PUT', body: JSON.stringify(input) },
    { accessToken },
  );
  return response.data;
}

export async function updateWorkerProjectAssignment(
  organizationId: string,
  projectId: string,
  workerId: string,
  accessToken: string,
  input: UpdateWorkerProjectAssignmentInput,
) {
  const response = await apiRequest<ApiEnvelope<WorkerProjectAssignmentSummary>>(
    `/organizations/${organizationId}/projects/${projectId}/workers/${workerId}/assignment`,
    { method: 'PATCH', body: JSON.stringify(input) },
    { accessToken },
  );
  return response.data;
}

export async function endWorkerProjectAssignment(
  organizationId: string,
  projectId: string,
  workerId: string,
  accessToken: string,
  input: EndWorkerProjectAssignmentInput,
) {
  const response = await apiRequest<ApiEnvelope<WorkerProjectAssignmentSummary>>(
    `/organizations/${organizationId}/projects/${projectId}/workers/${workerId}/end-assignment`,
    { method: 'POST', body: JSON.stringify(input) },
    { accessToken },
  );
  return response.data;
}
