import type {
  SiteExpenseDetail,
  SiteExpenseListResponse,
  SiteExpenseSummary,
  ExpenseWorkflowMode,
} from "@nirman-app/shared";
import { api, apiClient } from "@/lib/api/api-client";
import type {
  ExpensesQuery,
  ExpenseSettings,
  ExpenseInput,
  UpdateExpenseInput,
  ExpenseCommandInput,
  ExpenseAdjustmentInput,
} from "../types/expenses.types";
const base = (org: string, project: string) =>
  `/organizations/${org}/projects/${project}/expenses`;
export type ExpenseWrite =
  | { action: "CREATE"; input: ExpenseInput }
  | { action: "EDIT"; id: string; input: UpdateExpenseInput }
  | { action: "ADJUST"; id: string; input: ExpenseAdjustmentInput }
  | {
      action: "SUBMIT" | "APPROVE" | "REJECT" | "CANCEL";
      id: string;
      input: ExpenseCommandInput;
    };
export const expensesService = {
  settings: (o: string, p: string, signal?: AbortSignal) =>
    api.get<ExpenseSettings>(`${base(o, p)}/settings`, { signal }),
  configure: (
    o: string,
    p: string,
    input: { workflowMode: ExpenseWorkflowMode; idempotencyKey: string },
  ) => api.put<ExpenseSettings>(`${base(o, p)}/settings`, input),
  list: (o: string, p: string, query: ExpensesQuery, signal?: AbortSignal) =>
    api.get<SiteExpenseListResponse>(base(o, p), { params: query, signal }),
  summary: (o: string, p: string, query: ExpensesQuery, signal?: AbortSignal) =>
    api.get<SiteExpenseSummary>(`${base(o, p)}/summary`, {
      params: query,
      signal,
    }),
  detail: (o: string, p: string, id: string, signal?: AbortSignal) =>
    api.get<SiteExpenseDetail>(`${base(o, p)}/${id}`, { signal }),
  write(o: string, p: string, command: ExpenseWrite) {
    if (command.action === "CREATE")
      return api.post<SiteExpenseDetail>(base(o, p), command.input);
    const path = `${base(o, p)}/${command.id}`;
    if (command.action === "EDIT")
      return api.patch<SiteExpenseDetail>(path, command.input);
    return api.post<SiteExpenseDetail>(
      `${path}/${command.action === "ADJUST" ? "adjustments" : command.action.toLowerCase()}`,
      command.input,
    );
  },
  async export(
    o: string,
    p: string,
    query: ExpensesQuery,
    signal?: AbortSignal,
  ) {
    return (
      await apiClient.get<string>(`${base(o, p)}/export`, {
        params: query,
        responseType: "text",
        signal,
      })
    ).data;
  },
};
