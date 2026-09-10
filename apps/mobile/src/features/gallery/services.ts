import type {
  GalleryEntry,
  GalleryListResponse,
  GallerySummary,
} from "@nirman-app/shared";
import { appConfig } from "../../config";
import { ApiRequestError, apiRequest } from "../../lib/api";
import type { GalleryQuery, QueuedGalleryUpload } from "./types";

type Envelope<T> = { success: boolean; data: T };
const base = (o: string, p: string) =>
  `/organizations/${o}/projects/${p}/gallery`;
function queryString(query: GalleryQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== "") params.set(k, String(v));
  });
  const value = params.toString();
  return value ? `?${value}` : "";
}
async function data<T>(path: string, token: string, init: RequestInit = {}) {
  return (await apiRequest<Envelope<T>>(path, init, { accessToken: token }))
    .data;
}

export const fetchGalleryEntries = (
  o: string,
  p: string,
  token: string,
  query: GalleryQuery = {},
) =>
  data<GalleryListResponse>(
    `${base(o, p)}/entries${queryString(query)}`,
    token,
  );
export const fetchGallerySummary = (o: string, p: string, token: string) =>
  data<GallerySummary>(`${base(o, p)}/summary`, token);
export const galleryMediaUrl = (entry: GalleryEntry) =>
  `${appConfig.apiBaseUrl}${entry.mediaPath}`;
export const approveGalleryEntry = (
  o: string,
  p: string,
  id: string,
  token: string,
  expectedVersion: number,
) =>
  data<GalleryEntry>(`${base(o, p)}/entries/${id}/approve`, token, {
    method: "POST",
    body: JSON.stringify({ expectedVersion }),
  });
export const rejectGalleryEntry = (
  o: string,
  p: string,
  id: string,
  token: string,
  expectedVersion: number,
  reason: string,
) =>
  data<GalleryEntry>(`${base(o, p)}/entries/${id}/reject`, token, {
    method: "POST",
    body: JSON.stringify({ expectedVersion, reason }),
  });

export async function uploadGalleryEntry(
  item: QueuedGalleryUpload,
  token: string,
) {
  const form = new FormData();
  form.append("entryId", item.entryId);
  form.append("idempotencyKey", item.idempotencyKey);
  form.append("category", item.category);
  form.append("capturedAt", item.capturedAt);
  if (item.stage) form.append("stage", item.stage);
  if (item.caption) form.append("caption", item.caption);
  if (item.width) form.append("width", String(item.width));
  if (item.height) form.append("height", String(item.height));
  form.append("file", {
    uri: item.uri,
    name: item.fileName,
    type: item.mimeType,
  } as unknown as Blob);
  const response = await fetch(
    `${appConfig.apiBaseUrl}${base(item.organizationId, item.projectId)}/entries`,
    {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      body: form,
    },
  );
  const payload = (await response.json().catch(() => null)) as
    | (Envelope<GalleryEntry> & {
        error?: { code?: string; message?: string };
        message?: string;
      })
    | null;
  if (!response.ok)
    throw new ApiRequestError(
      payload?.error?.message ??
        payload?.message ??
        `Upload failed with ${response.status}`,
      response.status,
      payload?.error?.code,
    );
  return payload!.data;
}
