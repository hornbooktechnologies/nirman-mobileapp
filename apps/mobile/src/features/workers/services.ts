import { apiRequest } from '../../lib/api';
import type {
  CreateWorkerInput,
  ProjectWorkerRosterResponse,
  WorkerDetail,
  WorkerDuplicateCandidate,
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
    `/organizations/${organizationId}/projects/${projectId}/workers?pageSize=100`,
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
