import type {
  MaterialRequestDetail,
  MaterialRequestListResponse,
  MaterialSummary,
  MaterialWorkflowMode,
} from "@nirman-app/shared";
import { api, apiClient } from "@/lib/api/api-client";
import type {
  MaterialSettings,
  MaterialsQuery,
  MaterialRequestInput,
  UpdateMaterialRequestInput,
  MaterialCommandInput,
  MaterialPurchaseInput,
  MaterialDeliveryInput,
} from "../types/materials.types";
const base = (org: string, project: string) =>
  `/organizations/${org}/projects/${project}/materials`;
export type MaterialWrite =
  | { action: "CREATE"; input: MaterialRequestInput }
  | { action: "EDIT"; id: string; input: UpdateMaterialRequestInput }
  | { action: "RECORD_PURCHASE"; id: string; input: MaterialPurchaseInput }
  | { action: "RECORD_DELIVERY"; id: string; input: MaterialDeliveryInput }
  | {
      action: "SUBMIT" | "VERIFY" | "RETURN" | "APPROVE" | "REJECT" | "CANCEL";
      id: string;
      input: MaterialCommandInput;
    };
export const materialsService = {
  settings: (o: string, p: string, signal?: AbortSignal) =>
    api.get<MaterialSettings>(`${base(o, p)}/settings`, { signal }),
  configure: (o: string, p: string, workflowMode: MaterialWorkflowMode, approverMemberIds?: string[], expectedVersion?: number) =>
    api.put<MaterialSettings>(`${base(o, p)}/settings`, { workflowMode, approverMemberIds, expectedVersion }),
  list: (o: string, p: string, query: MaterialsQuery, signal?: AbortSignal) =>
    api.get<MaterialRequestListResponse>(base(o, p), { params: query, signal }),
  summary: (
    o: string,
    p: string,
    query: MaterialsQuery,
    signal?: AbortSignal,
  ) =>
    api.get<MaterialSummary>(`${base(o, p)}/summary`, {
      params: query,
      signal,
    }),
  detail: (o: string, p: string, id: string, signal?: AbortSignal) =>
    api.get<MaterialRequestDetail>(`${base(o, p)}/${id}`, { signal }),
  write(o: string, p: string, command: MaterialWrite) {
    if (command.action === "CREATE")
      return api.post<MaterialRequestDetail>(base(o, p), command.input);
    const path = `${base(o, p)}/${command.id}`;
    if (command.action === "EDIT")
      return api.patch<MaterialRequestDetail>(path, command.input);
    const action =
      command.action === "RECORD_PURCHASE"
        ? "purchases"
        : command.action === "RECORD_DELIVERY"
          ? "deliveries"
          : command.action.toLowerCase();
    return api.post<MaterialRequestDetail>(`${path}/${action}`, command.input);
  },
  async export(o: string, p: string, query: MaterialsQuery) {
    return (
      await apiClient.get<string>(`${base(o, p)}/export`, {
        params: query,
        responseType: "text",
      })
    ).data;
  },
};
