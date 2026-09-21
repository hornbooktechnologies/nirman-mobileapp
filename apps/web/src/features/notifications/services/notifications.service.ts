import type {
  NotificationItem,
  NotificationListResponse,
  NotificationSummary,
} from "@nirman-app/shared";
import { api } from "@/lib/api/api-client";
const base = (org: string) =>
  `/organizations/${encodeURIComponent(org)}/notifications`;
export const notificationsService = {
  list: (
    org: string,
    page: number,
    unreadOnly: boolean,
    signal?: AbortSignal,
  ) =>
    api.get<NotificationListResponse>(base(org), {
      params: { page, pageSize: 25, unreadOnly },
      signal,
    }),
  summary: (org: string, signal?: AbortSignal) =>
    api.get<NotificationSummary>(`${base(org)}/summary`, { signal }),
  read: (org: string, id: string, signal?: AbortSignal) =>
    api.post<{ id: string; read: true }>(
      `${base(org)}/${encodeURIComponent(id)}/read`,
      undefined,
      { signal },
    ),
  readAll: (org: string, signal?: AbortSignal) =>
    api.post<{ updated: number }>(`${base(org)}/read-all`, undefined, {
      signal,
    }),
  verifyTarget: async (
    org: string,
    item: NotificationItem,
    type: string | undefined,
    signal: AbortSignal,
  ) => {
    const projectBase = `/organizations/${encodeURIComponent(org)}/projects/${encodeURIComponent(item.projectId!)}`;
    const id = encodeURIComponent(item.referenceId!);
    if (type === "material_request" || type === "site_expense") {
      await api.get(
        `${projectBase}/${type === "material_request" ? "materials" : "expenses"}/${id}`,
        { signal },
      );
    } else if (type === "lead") {
      await api.get(`${projectBase}/sales/leads/${id}`, { signal });
    } else if (type === "unit") {
      const units = await api.get<{ id: string }[]>(
        `${projectBase}/sales/units`,
        { signal },
      );
      if (!units.some((unit) => unit.id === item.referenceId))
        throw new Error("This unit is no longer available to you.");
    }
  },
};
