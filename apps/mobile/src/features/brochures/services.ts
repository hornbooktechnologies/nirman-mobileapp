import type {
  BrochureAsset,
  BrochureLibraryResponse,
  BrochureShareResult,
} from "@nirman-app/shared";
import { appConfig } from "../../config";
import { ApiRequestError, apiRequest } from "../../lib/api";

type Envelope<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: { code?: string; message?: string };
};
const base = (o: string, p: string) =>
  `/organizations/${o}/projects/${p}/brochures`;
async function data<T>(path: string, token: string, init: RequestInit = {}) {
  return (await apiRequest<Envelope<T>>(path, init, { accessToken: token }))
    .data;
}
export const fetchBrochures = (o: string, p: string, token: string) =>
  data<BrochureLibraryResponse>(base(o, p), token);
export const shareBrochuresByEmail = (
  o: string,
  p: string,
  token: string,
  input: {
    assetIds: string[];
    recipientEmail: string;
    recipientName?: string;
    leadId?: string;
    idempotencyKey: string;
  },
) =>
  data<BrochureShareResult>(`${base(o, p)}/shares/email`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const createBrochureShareLink = (
  o: string,
  p: string,
  token: string,
  assetIds: string[],
) =>
  data<BrochureShareResult>(`${base(o, p)}/shares/other`, token, {
    method: "POST",
    body: JSON.stringify({ assetIds, idempotencyKey: crypto.randomUUID() }),
  });
export const archiveBrochure = (
  o: string,
  p: string,
  token: string,
  id: string,
) =>
  data<BrochureAsset>(`${base(o, p)}/${id}/archive`, token, { method: "POST" });
export const brochureMediaUrl = (asset: BrochureAsset) =>
  `${appConfig.apiBaseUrl}${asset.mediaPath}`;

export async function uploadBrochure(
  o: string,
  p: string,
  token: string,
  input: {
    uri: string;
    name: string;
    mimeType: string;
    size?: number;
    title: string;
    description?: string;
    category: string;
  },
) {
  const form = new FormData();
  form.append("assetId", crypto.randomUUID());
  form.append("idempotencyKey", crypto.randomUUID());
  form.append("title", input.title);
  form.append("category", input.category);
  if (input.description) form.append("description", input.description);
  form.append("file", {
    uri: input.uri,
    name: input.name,
    type: input.mimeType,
  } as unknown as Blob);
  const response = await fetch(`${appConfig.apiBaseUrl}${base(o, p)}`, {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    body: form,
  });
  const payload = (await response
    .json()
    .catch(() => null)) as Envelope<BrochureAsset> | null;
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
