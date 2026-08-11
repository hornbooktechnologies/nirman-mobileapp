import { appConfig } from '../../config';

type ApiClientOptions = {
  accessToken?: string;
};

type ApiErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
};

export async function apiRequest<TResponse>(path: string, init: RequestInit = {}, options: ApiClientOptions = {}) {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.accessToken) {
    headers.set('Authorization', `Bearer ${options.accessToken}`);
  }

  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    ...init,
    headers,
  });

  const payload = (await response.json().catch(() => null)) as TResponse | ApiErrorEnvelope | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object'
        ? 'error' in payload && payload.error?.message
          ? payload.error.message
          : 'message' in payload && payload.message
            ? payload.message
            : `API request failed with ${response.status}`
        : `API request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload as TResponse;
}
