import type { ProjectProgressSummary, ProjectProgressHistoryResponse, ProjectProgressPortfolioItem } from "@nirman-app/shared";
import { api, apiClient } from "@/lib/api/api-client";
import type { ProgressInput, ProgressQuery } from "../types/progress.types";
const base = (o: string, p: string) => `/organizations/${o}/projects/${p}/progress`;
export const progressService = {
  summary: (o: string, p: string, signal?: AbortSignal) => api.get<ProjectProgressSummary>(`${base(o, p)}/summary`, { signal }),
  history: (o: string, p: string, query: ProgressQuery, signal?: AbortSignal) => api.get<ProjectProgressHistoryResponse>(`${base(o, p)}/history`, { params: query, signal }),
  record: (o: string, p: string, input: ProgressInput) => api.post<ProjectProgressSummary>(`${base(o, p)}/updates`, input),
  portfolio: (o: string, signal?: AbortSignal) => api.get<ProjectProgressPortfolioItem[]>(`/organizations/${o}/progress/projects`, { signal }),
  export: async (o: string, p: string, query: ProgressQuery, signal?: AbortSignal) => (await apiClient.get<string>(`${base(o, p)}/export`, { params: query, responseType: "text", signal })).data,
};
