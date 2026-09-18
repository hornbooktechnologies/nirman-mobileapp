import type { GalleryEntry, GalleryListResponse, GallerySummary, GalleryCategory, GalleryStatus, ProjectProgressStage } from "@nirman-app/shared";
import { api } from "@/lib/api/api-client";
import type { QueuedPhoto } from "../queue";
export type GalleryQuery = { page: number; pageSize: number; category?: GalleryCategory; status?: GalleryStatus; stage?: ProjectProgressStage; dateFrom?: string; dateTo?: string };
const base = (o: string, p: string) => `/organizations/${o}/projects/${p}/gallery`;
export const galleryService = {
  list: (o: string, p: string, params: GalleryQuery, signal?: AbortSignal) => api.get<GalleryListResponse>(`${base(o,p)}/entries`, { params, signal }),
  summary: (o: string, p: string, signal?: AbortSignal) => api.get<GallerySummary>(`${base(o,p)}/summary`, { signal }),
  media: (o: string, p: string, id: string, signal?: AbortSignal) => api.get<Blob>(`${base(o,p)}/entries/${id}/media`, { responseType: "blob", signal }),
  upload: (row: QueuedPhoto, signal: AbortSignal) => {
    const form = new FormData();
    for (const key of ["entryId", "idempotencyKey", "category", "stage", "caption", "capturedAt"] as const) if (row[key]) form.append(key, row[key]!);
    form.append("file", row.file, row.fileName);
    return api.post<GalleryEntry>(`${base(row.org,row.project)}/entries`, form, { headers: { "Content-Type": undefined }, signal });
  },
  review: (o: string, p: string, entry: GalleryEntry, action: "approve" | "reject", reason: string, signal: AbortSignal) => api.post<GalleryEntry>(`${base(o,p)}/entries/${entry.id}/${action}`, { expectedVersion: entry.version, ...(action === "reject" ? { reason: reason.trim() } : {}) }, { signal }),
};
