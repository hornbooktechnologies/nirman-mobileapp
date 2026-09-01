import { api } from "@/lib/api/api-client";
import type {
  AssignWorkerToProjectInput,
  CreateWorkerInput,
  EndWorkerProjectAssignmentInput,
  ProjectWorkerRosterResponse,
  UpdateWorkerAssignmentRateInput,
  UpdateWorkerInput,
  UpdateWorkerProjectAssignmentInput,
  WorkerDetail,
  WorkerDeletionResult,
  WorkerDuplicateCandidate,
  WorkerListFilter,
  WorkerListResponse,
  WorkerProjectAssignmentSummary,
} from "@/features/workers/types/workers.types";

function queryString(query?: Record<string, string | number | undefined> | WorkerListFilter) {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function normalizeWorkerListResponse(
  response: WorkerListResponse | WorkerListResponse["data"],
): WorkerListResponse {
  if (Array.isArray(response)) {
    return {
      data: response,
      meta: {
        total: response.length,
        page: 1,
        pageSize: response.length,
        pageCount: response.length > 0 ? 1 : 0,
      },
    };
  }
  return {
    data: Array.isArray(response.data) ? response.data : [],
    meta: response.meta ?? {
      total: Array.isArray(response.data) ? response.data.length : 0,
      page: 1,
      pageSize: Array.isArray(response.data) ? response.data.length : 0,
      pageCount: Array.isArray(response.data) && response.data.length > 0 ? 1 : 0,
    },
  };
}

function normalizeRosterResponse(
  response: ProjectWorkerRosterResponse | ProjectWorkerRosterResponse["data"],
): ProjectWorkerRosterResponse {
  if (Array.isArray(response)) {
    return {
      data: response,
      meta: {
        total: response.length,
        page: 1,
        pageSize: response.length,
        pageCount: response.length > 0 ? 1 : 0,
      },
    };
  }
  return {
    data: Array.isArray(response.data) ? response.data : [],
    meta: response.meta ?? {
      total: Array.isArray(response.data) ? response.data.length : 0,
      page: 1,
      pageSize: Array.isArray(response.data) ? response.data.length : 0,
      pageCount: Array.isArray(response.data) && response.data.length > 0 ? 1 : 0,
    },
  };
}

export const workersService = {
  async workers(organizationId: string, query?: WorkerListFilter) {
    const response = await api.get<WorkerListResponse | WorkerListResponse["data"]>(
      `/organizations/${organizationId}/workers${queryString(query)}`,
    );
    return normalizeWorkerListResponse(response);
  },
  worker(organizationId: string, workerId: string) {
    return api.get<WorkerDetail>(`/organizations/${organizationId}/workers/${workerId}`);
  },
  duplicateCandidates(
    organizationId: string,
    query: { name?: string; mobileNumber?: string },
  ) {
    return api.get<WorkerDuplicateCandidate[]>(
      `/organizations/${organizationId}/workers/duplicate-candidates${queryString(query)}`,
    );
  },
  createWorker(organizationId: string, input: CreateWorkerInput) {
    return api.post<WorkerDetail, CreateWorkerInput>(
      `/organizations/${organizationId}/workers`,
      input,
    );
  },
  updateWorker(organizationId: string, workerId: string, input: UpdateWorkerInput) {
    return api.patch<WorkerDetail, UpdateWorkerInput>(
      `/organizations/${organizationId}/workers/${workerId}`,
      input,
    );
  },
  deactivateWorker(organizationId: string, workerId: string, reason?: string | null) {
    return api.post<WorkerDetail, { reason?: string | null }>(
      `/organizations/${organizationId}/workers/${workerId}/deactivate`,
      { reason },
    );
  },
  deleteWorker(organizationId: string, workerId: string) {
    return api.delete<WorkerDeletionResult>(
      `/organizations/${organizationId}/workers/${workerId}`,
    );
  },
  async projectRoster(organizationId: string, projectId: string, query?: WorkerListFilter) {
    const response = await api.get<
      ProjectWorkerRosterResponse | ProjectWorkerRosterResponse["data"]
    >(
      `/organizations/${organizationId}/projects/${projectId}/workers${queryString(query)}`,
    );
    return normalizeRosterResponse(response);
  },
  assignWorker(
    organizationId: string,
    projectId: string,
    workerId: string,
    input: AssignWorkerToProjectInput,
  ) {
    return api.put<WorkerProjectAssignmentSummary, AssignWorkerToProjectInput>(
      `/organizations/${organizationId}/projects/${projectId}/workers/${workerId}`,
      input,
    );
  },
  updateAssignment(
    organizationId: string,
    projectId: string,
    workerId: string,
    input: UpdateWorkerProjectAssignmentInput,
  ) {
    return api.patch<WorkerProjectAssignmentSummary, UpdateWorkerProjectAssignmentInput>(
      `/organizations/${organizationId}/projects/${projectId}/workers/${workerId}/assignment`,
      input,
    );
  },
  updateRate(
    organizationId: string,
    projectId: string,
    workerId: string,
    input: UpdateWorkerAssignmentRateInput,
  ) {
    return api.post<WorkerProjectAssignmentSummary, UpdateWorkerAssignmentRateInput>(
      `/organizations/${organizationId}/projects/${projectId}/workers/${workerId}/assignment/rate-change`,
      input,
    );
  },
  endAssignment(
    organizationId: string,
    projectId: string,
    workerId: string,
    input: EndWorkerProjectAssignmentInput,
  ) {
    return api.post<WorkerProjectAssignmentSummary, EndWorkerProjectAssignmentInput>(
      `/organizations/${organizationId}/projects/${projectId}/workers/${workerId}/end-assignment`,
      input,
    );
  },
};
