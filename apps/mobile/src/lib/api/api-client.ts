import { appConfig } from '../../config';

type ApiClientOptions = {
  accessToken?: string;
};

type UnauthorizedHandler = (rejectedAccessToken: string) => void | Promise<void>;

type ApiErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

let unauthorizedHandler: UnauthorizedHandler = () => undefined;
const unauthorizedRequests = new Map<string, Promise<void>>();

export function setApiUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler;
}

async function notifyUnauthorized(rejectedAccessToken: string) {
  let request = unauthorizedRequests.get(rejectedAccessToken);
  if (!request) {
    request = Promise.resolve(unauthorizedHandler(rejectedAccessToken));
    unauthorizedRequests.set(rejectedAccessToken, request);
  }

  try {
    await request;
  } finally {
    if (unauthorizedRequests.get(rejectedAccessToken) === request) {
      unauthorizedRequests.delete(rejectedAccessToken);
    }
  }
}

export async function apiRequest<TResponse>(path: string, init: RequestInit = {}, options: ApiClientOptions = {}) {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
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
    if (response.status === 401 && options.accessToken) {
      await notifyUnauthorized(options.accessToken);
    }
    const message =
      payload && typeof payload === 'object'
        ? 'error' in payload && payload.error?.message
          ? payload.error.message
          : 'message' in payload && payload.message
            ? payload.message
            : `API request failed with ${response.status}`
        : `API request failed with ${response.status}`;
    const code =
      payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      payload.error?.code
        ? payload.error.code
        : undefined;
    throw new ApiRequestError(message, response.status, code);
  }

  return payload as TResponse;
}
