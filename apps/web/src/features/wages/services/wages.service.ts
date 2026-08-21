import { api, apiClient } from "@/lib/api/api-client";
import type {
  WageBatch,
  WageBatchDetail,
  WagePaymentMethod,
  WagePreview,
} from "@/features/wages/types/wages.types";

export const wagesService = {
  preview(organizationId: string, projectId: string, start: string, end: string) {
    return api.get<WagePreview>(
      `/organizations/${organizationId}/projects/${projectId}/wages/preview?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    );
  },
  batches(organizationId: string, projectId: string) {
    return api.get<WageBatch[]>(
      `/organizations/${organizationId}/projects/${projectId}/wages/batches`,
    );
  },
  batchDetail(organizationId: string, projectId: string, batchId: string) {
    return api.get<WageBatchDetail>(
      `/organizations/${organizationId}/projects/${projectId}/wages/batches/${batchId}`,
    );
  },
  createBatch(
    organizationId: string,
    projectId: string,
    input: { periodStart: string; periodEnd: string },
  ) {
    return api.post<WageBatchDetail, typeof input>(
      `/organizations/${organizationId}/projects/${projectId}/wages/batches`,
      input,
    );
  },
  recordPayment(
    organizationId: string,
    projectId: string,
    wageItemId: string,
    input: {
      amount: number;
      paymentDate: string;
      paymentMethod: WagePaymentMethod;
      reference?: string | null;
      idempotencyKey?: string | null;
    },
  ) {
    return api.post<WageBatchDetail, typeof input>(
      `/organizations/${organizationId}/projects/${projectId}/wages/items/${wageItemId}/payments`,
      input,
    );
  },
  updateItem(
    organizationId: string,
    projectId: string,
    wageItemId: string,
    input: { adjustmentAmount?: number; notes?: string | null },
  ) {
    return api.patch<WageBatchDetail, typeof input>(
      `/organizations/${organizationId}/projects/${projectId}/wages/items/${wageItemId}`,
      input,
    );
  },
  async exportCsv(organizationId: string, projectId: string, batchId: string) {
    const response = await apiClient.get<string>(
      `/organizations/${organizationId}/projects/${projectId}/wages/batches/${batchId}/export`,
      { responseType: "text" },
    );
    return response.data;
  },
};
