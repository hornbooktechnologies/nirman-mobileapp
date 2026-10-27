import type {
  BrochureAsset,
  BrochureLibraryResponse,
  BrochureShare,
  BrochureShareResult,
} from "@nirman-app/shared";
import { api } from "@/lib/api/api-client";

const base = (o: string, p: string) =>
  `/organizations/${encodeURIComponent(o)}/projects/${encodeURIComponent(p)}/brochures`;
export const brochuresService = {
  list: (o: string, p: string, signal?: AbortSignal) =>
    api.get<BrochureLibraryResponse>(base(o, p), { signal }),
  upload: (
    o: string,
    p: string,
    input: {
      file: File;
      title: string;
      description?: string;
      category: string;
      assetId: string;
      idempotencyKey: string;
    },
  ) => {
    const form = new FormData();
    form.append("file", input.file, input.file.name);
    form.append("assetId", input.assetId);
    form.append("idempotencyKey", input.idempotencyKey);
    form.append("title", input.title);
    form.append("category", input.category);
    if (input.description) form.append("description", input.description);
    return api.post<BrochureAsset>(base(o, p), form, {
      headers: { "Content-Type": undefined },
    });
  },
  email: (
    o: string,
    p: string,
    input: {
      assetIds: string[];
      recipientEmail: string;
      recipientName?: string;
      leadId?: string;
      idempotencyKey: string;
    },
  ) => api.post<BrochureShareResult>(`${base(o, p)}/shares/email`, input),
  other: (o: string, p: string, assetIds: string[]) =>
    api.post<BrochureShareResult>(`${base(o, p)}/shares/other`, {
      assetIds,
      idempotencyKey: crypto.randomUUID(),
    }),
  history: (o: string, p: string, signal?: AbortSignal) =>
    api.get<BrochureShare[]>(`${base(o, p)}/shares`, { signal }),
  delete: (o: string, p: string, id: string) =>
    api.delete<BrochureAsset>(`${base(o, p)}/${encodeURIComponent(id)}`, { data: { confirmation: "DELETE" } }),
  media: (o: string, p: string, id: string, signal?: AbortSignal) =>
    api.get<Blob>(`${base(o, p)}/${encodeURIComponent(id)}/media`, {
      responseType: "blob",
      signal,
    }),
  mediaUrl: (o: string, p: string, id: string) =>
    `/api/v1${base(o, p)}/${encodeURIComponent(id)}/media`,
};
