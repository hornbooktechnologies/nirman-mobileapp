import type { KharchiAdvanceDetail, KharchiListResponse, KharchiSummary, KharchiBalanceStatus, KharchiPaymentMethod, ProjectWorkerRosterResponse } from "@nirman-app/shared";
import { api, apiClient } from "@/lib/api/api-client";

export type KharchiQuery = {
  page?: number; pageSize?: number; search?: string; workerId?: string; workerAssignmentId?: string;
  startDate?: string; endDate?: string; status?: KharchiBalanceStatus; paymentMethod?: KharchiPaymentMethod;
  sortBy?: "requestDate" | "createdAt" | "workerName" | "outstandingAmount"; sortOrder?: "asc" | "desc";
};
export type AdvanceInput = { workerAssignmentId: string; amount: number; requestDate: string; paymentMethod: KharchiPaymentMethod; paymentReference: string | null; notes: string | null };
export type AdjustmentInput = { amount: number; reason: string };
const base = (org: string, project: string) => `/organizations/${org}/projects/${project}/kharchi`;
export const kharchiService = {
  eligible: (org: string, project: string, date: string, search: string, page: number) => api.get<ProjectWorkerRosterResponse>(`/organizations/${org}/projects/${project}/workers`, { params: { date, search, page, pageSize: 20, assignmentScope: "CURRENT", status: "ACTIVE", sortBy: "name", sortOrder: "asc" } }),
  list: (org: string, project: string, query: KharchiQuery) => api.get<KharchiListResponse>(base(org, project), { params: query }),
  summary: (org: string, project: string, query: Pick<KharchiQuery, "workerId" | "workerAssignmentId" | "startDate" | "endDate">) => api.get<KharchiSummary>(`${base(org, project)}/summary`, { params: query }),
  detail: (org: string, project: string, id: string) => api.get<KharchiAdvanceDetail>(`${base(org, project)}/${id}`),
  create: (org: string, project: string, input: AdvanceInput & { idempotencyKey: string }) => api.post<KharchiAdvanceDetail>(base(org, project), input),
  adjust: (org: string, project: string, id: string, input: AdjustmentInput & { idempotencyKey: string }) => api.post<KharchiAdvanceDetail>(`${base(org, project)}/${id}/adjustments`, input),
  async export(org: string, project: string, query: KharchiQuery) {
    const response = await apiClient.get<string>(`${base(org, project)}/export`, { params: query, responseType: "text" });
    return response.data;
  },
};
