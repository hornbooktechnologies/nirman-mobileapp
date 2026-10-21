import "server-only";

import { ApiError } from "./api-error";

type JsonBody = Record<string, unknown> | readonly unknown[];

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  readonly baseUrl?: string;
  readonly body?: BodyInit | JsonBody | null;
};

function createUrl(path: string, baseUrl?: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const resolvedBaseUrl = baseUrl ?? process.env.API_BASE_URL;

  if (!resolvedBaseUrl) {
    throw new Error("API_BASE_URL is required for relative API requests.");
  }

  return `${resolvedBaseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function isJsonBody(body: ApiRequestOptions["body"]): body is JsonBody {
  if (body === null || typeof body !== "object") {
    return false;
  }

  return Array.isArray(body) || Object.getPrototypeOf(body) === Object.prototype;
}

export async function apiRequest<TResponse>(
  path: string,
  { baseUrl, body, headers: initialHeaders, ...init }: ApiRequestOptions = {},
): Promise<TResponse> {
  const headers = new Headers(initialHeaders);
  const requestBody = isJsonBody(body) ? JSON.stringify(body) : body;

  if (isJsonBody(body) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(createUrl(path, baseUrl), {
    ...init,
    body: requestBody,
    headers,
  });

  if (!response.ok) {
    const details = await response.json().catch(() => undefined);
    throw new ApiError({
      status: response.status,
      message: response.statusText || "API request failed",
      details,
    });
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}
