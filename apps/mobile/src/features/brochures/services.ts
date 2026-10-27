import { uuid } from "expo";
import { appendUploadFile, multipartUpload } from "../../lib/multipart-upload";
import type {
  BrochureAsset,
  BrochureLibraryResponse,
  BrochureShareResult,
} from "@nirman-app/shared";
import { appConfig } from "../../config";
import { apiRequest } from "../../lib/api";

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
    body: JSON.stringify({ assetIds, idempotencyKey: uuid.v4() }),
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
  form.append("assetId", uuid.v4());
  form.append("idempotencyKey", uuid.v4());
  form.append("title", input.title);
  form.append("category", input.category);
  if (input.description) form.append("description", input.description);
  await appendUploadFile(form, {
    uri: input.uri,
    name: input.name,
    type: input.mimeType,
  });
  return multipartUpload<BrochureAsset>(base(o, p), token, form);
}
