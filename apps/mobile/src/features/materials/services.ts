import type { MaterialRequestDetail, MaterialRequestListResponse, MaterialSummary, MaterialWorkflowMode } from '@nirman-app/shared';

import { appConfig } from '../../config';
import { ApiRequestError, apiRequest } from '../../lib/api';
import type { MaterialCommandInput, MaterialDeliveryInput, MaterialPurchaseInput, MaterialRequestInput, MaterialSettings, MaterialsQuery, UpdateMaterialRequestInput } from './types';

type ApiEnvelope<T> = { success: boolean; data: T };

const base = (organizationId: string, projectId: string) => `/organizations/${organizationId}/projects/${projectId}/materials`;

function queryString(query: MaterialsQuery) {
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

export const fetchMaterialSettings = (o: string, p: string, token: string) => data<MaterialSettings>(`${base(o, p)}/settings`, token);
export const configureMaterialSettings = (o: string, p: string, token: string, workflowMode: MaterialWorkflowMode) => data<MaterialSettings>(`${base(o, p)}/settings`, token, { method: 'PUT', body: JSON.stringify({ workflowMode }) });
export const fetchMaterials = (o: string, p: string, token: string, query: MaterialsQuery = {}) => data<MaterialRequestListResponse>(`${base(o, p)}${queryString(query)}`, token);
export const fetchMaterialsSummary = (o: string, p: string, token: string, query: MaterialsQuery = {}) => data<MaterialSummary>(`${base(o, p)}/summary${queryString(query)}`, token);
export const fetchMaterialDetail = (o: string, p: string, id: string, token: string) => data<MaterialRequestDetail>(`${base(o, p)}/${id}`, token);
export const createMaterialRequest = (o: string, p: string, token: string, input: MaterialRequestInput) => data<MaterialRequestDetail>(base(o, p), token, { method: 'POST', body: JSON.stringify(input) });
export const updateMaterialRequest = (o: string, p: string, id: string, token: string, input: UpdateMaterialRequestInput) => data<MaterialRequestDetail>(`${base(o, p)}/${id}`, token, { method: 'PATCH', body: JSON.stringify(input) });
export const runMaterialCommand = (o: string, p: string, id: string, action: 'submit' | 'verify' | 'return' | 'approve' | 'reject' | 'cancel', token: string, input: MaterialCommandInput) => data<MaterialRequestDetail>(`${base(o, p)}/${id}/${action}`, token, { method: 'POST', body: JSON.stringify(input) });
export const recordMaterialPurchase = (o: string, p: string, id: string, token: string, input: MaterialPurchaseInput) => data<MaterialRequestDetail>(`${base(o, p)}/${id}/purchases`, token, { method: 'POST', body: JSON.stringify(input) });
export const recordMaterialDelivery = (o: string, p: string, id: string, token: string, input: MaterialDeliveryInput) => data<MaterialRequestDetail>(`${base(o, p)}/${id}/deliveries`, token, { method: 'POST', body: JSON.stringify(input) });

export async function exportMaterialsCsv(o: string, p: string, token: string, query: MaterialsQuery = {}) {
  const response = await fetch(`${appConfig.apiBaseUrl}${base(o, p)}/export${queryString(query)}`, { headers: { Accept: 'text/csv', Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new ApiRequestError(`Materials export failed with ${response.status}`, response.status);
  return { csv: await response.text(), filename: response.headers.get('content-disposition') ?? 'materials.csv' };
}
