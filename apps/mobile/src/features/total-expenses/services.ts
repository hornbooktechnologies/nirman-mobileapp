import type {
  TotalExpensesQuery,
  TotalExpensesList,
  TotalExpensesSummary,
  MaterialExpensesList,
  PaymentLedger,
  RecordSourcePayment,
  VoidSourcePayment,
} from "@nirman-app/shared";
import { apiRequest } from "../../lib/api";
async function data<T>(path: string, token: string, init: RequestInit = {}) {
  const response = await apiRequest<{ success: boolean; data: T }>(path, init, {
    accessToken: token,
  });
  return response.data;
}
export function fetchSpending<
  T extends TotalExpensesList | TotalExpensesSummary | MaterialExpensesList,
>(
  org: string,
  project: string,
  token: string,
  query: TotalExpensesQuery,
  summary: boolean | "materials" = false,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  return data<T>(
    `/organizations/${org}/projects/${project}/total-expenses${summary === "materials" ? "/materials" : summary ? "/summary" : ""}?${params}`,
    token,
    { signal },
  );
}
export function sourcePaymentPath(
  org: string,
  project: string,
  source: "materials" | "expenses",
  id: string,
  parent?: string,
) {
  return `/organizations/${org}/projects/${project}/${source}/${source === "materials" ? `${parent}/purchases/` : ""}${id}/payments`;
}
export function sendSourcePayment(
  path: string,
  token: string,
  body: RecordSourcePayment | VoidSourcePayment,
) {
  return data<PaymentLedger>(path, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
