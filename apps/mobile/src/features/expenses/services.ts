import type { SiteExpenseDetail, SiteExpenseListResponse, SiteExpenseSummary, ExpenseWorkflowMode } from '@nirman-app/shared';

import { appConfig } from '../../config';
import { ApiRequestError, apiRequest } from '../../lib/api';
import type { ExpenseAdjustmentInput, ExpenseCommandInput, ExpenseInput, ExpenseSettings, ExpensesQuery, UpdateExpenseInput } from './types';

type ApiEnvelope<T> = { success: boolean; data: T };
const base = (organizationId: string, projectId: string) => `/organizations/${organizationId}/projects/${projectId}/expenses`;

function queryString(query: ExpensesQuery) {
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

export const fetchExpenseSettings = (o: string, p: string, token: string) => data<ExpenseSettings>(`${base(o, p)}/settings`, token);
export const configureExpenseSettings = (o: string, p: string, token: string, workflowMode: ExpenseWorkflowMode, idempotencyKey: string) => data<ExpenseSettings>(`${base(o, p)}/settings`, token, { method: 'PUT', body: JSON.stringify({ workflowMode, idempotencyKey }) });
export const fetchExpenses = (o: string, p: string, token: string, query: ExpensesQuery = {}) => data<SiteExpenseListResponse>(`${base(o, p)}${queryString(query)}`, token);
export const fetchExpenseSummary = (o: string, p: string, token: string, query: ExpensesQuery = {}) => data<SiteExpenseSummary>(`${base(o, p)}/summary${queryString(query)}`, token);
export const fetchExpenseDetail = (o: string, p: string, id: string, token: string) => data<SiteExpenseDetail>(`${base(o, p)}/${id}`, token);
export const createExpense = (o: string, p: string, token: string, input: ExpenseInput) => data<SiteExpenseDetail>(base(o, p), token, { method: 'POST', body: JSON.stringify(input) });
export const updateExpense = (o: string, p: string, id: string, token: string, input: UpdateExpenseInput) => data<SiteExpenseDetail>(`${base(o, p)}/${id}`, token, { method: 'PATCH', body: JSON.stringify(input) });
export const runExpenseCommand = (o: string, p: string, id: string, action: 'submit' | 'approve' | 'reject' | 'cancel', token: string, input: ExpenseCommandInput) => data<SiteExpenseDetail>(`${base(o, p)}/${id}/${action}`, token, { method: 'POST', body: JSON.stringify(input) });
export const adjustExpense = (o: string, p: string, id: string, token: string, input: ExpenseAdjustmentInput) => data<SiteExpenseDetail>(`${base(o, p)}/${id}/adjustments`, token, { method: 'POST', body: JSON.stringify(input) });

export async function exportExpensesCsv(o: string, p: string, token: string, query: ExpensesQuery = {}) {
  const response = await fetch(`${appConfig.apiBaseUrl}${base(o, p)}/export${queryString(query)}`, { headers: { Accept: 'text/csv', Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new ApiRequestError(`Expenses export failed with ${response.status}`, response.status);
  return { csv: await response.text(), filename: response.headers.get('content-disposition') ?? 'expenses.csv' };
}

