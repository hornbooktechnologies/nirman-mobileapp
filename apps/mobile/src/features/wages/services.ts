import type {
  WageBatch,
  WageBatchDetail,
  WagePaymentMethod,
  WagePreview,
} from "@nirman-app/shared";
import { appConfig } from "../../config";
import { ApiRequestError, apiRequest } from "../../lib/api";

type ApiEnvelope<TData> = {
  success: boolean;
  data: TData;
};

export async function fetchWagePreview(
  organizationId: string,
  projectId: string,
  start: string,
  end: string,
  accessToken: string,
) {
  const response = await apiRequest<ApiEnvelope<WagePreview>>(
    `/organizations/${organizationId}/projects/${projectId}/wages/preview?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    {},
    { accessToken },
  );
  return response.data;
}

export async function fetchWageBatches(
  organizationId: string,
  projectId: string,
  accessToken: string,
) {
  const response = await apiRequest<ApiEnvelope<WageBatch[]>>(
    `/organizations/${organizationId}/projects/${projectId}/wages/batches`,
    {},
    { accessToken },
  );
  return response.data;
}

export async function fetchWageBatchDetail(
  organizationId: string,
  projectId: string,
  batchId: string,
  accessToken: string,
) {
  const response = await apiRequest<ApiEnvelope<WageBatchDetail>>(
    `/organizations/${organizationId}/projects/${projectId}/wages/batches/${batchId}`,
    {},
    { accessToken },
  );
  return response.data;
}

export async function createWageBatch(
  organizationId: string,
  projectId: string,
  periodStart: string,
  periodEnd: string,
  accessToken: string,
) {
  const response = await apiRequest<ApiEnvelope<WageBatchDetail>>(
    `/organizations/${organizationId}/projects/${projectId}/wages/batches`,
    { method: "POST", body: JSON.stringify({ periodStart, periodEnd }) },
    { accessToken },
  );
  return response.data;
}

export async function recordWagePayment(
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
  accessToken: string,
) {
  const response = await apiRequest<ApiEnvelope<WageBatchDetail>>(
    `/organizations/${organizationId}/projects/${projectId}/wages/items/${wageItemId}/payments`,
    { method: "POST", body: JSON.stringify(input) },
    { accessToken },
  );
  return response.data;
}

export async function updateWageItem(
  organizationId: string,
  projectId: string,
  wageItemId: string,
  input: { adjustmentAmount?: number; notes?: string | null },
  accessToken: string,
) {
  const response = await apiRequest<ApiEnvelope<WageBatchDetail>>(
    `/organizations/${organizationId}/projects/${projectId}/wages/items/${wageItemId}`,
    { method: "PATCH", body: JSON.stringify(input) },
    { accessToken },
  );
  return response.data;
}

export async function exportWageBatchCsv(
  organizationId: string,
  projectId: string,
  batchId: string,
  accessToken: string,
) {
  const response = await fetch(
    `${appConfig.apiBaseUrl}/organizations/${organizationId}/projects/${projectId}/wages/batches/${batchId}/export`,
    {
      headers: {
        Accept: "text/csv",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new ApiRequestError(
      `Wage export failed with ${response.status}`,
      response.status,
    );
  }

  return response.text();
}
