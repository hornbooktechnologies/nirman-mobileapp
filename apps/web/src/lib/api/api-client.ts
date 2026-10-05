import {
  FINANCIAL_DATA_CHANGED,
  financialMutationScope,
} from "./financial-events";
import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";

type TokenGetter = () => string | null;
type TokenSetter = (token: string) => void;
type SessionClearer = () => void;

interface AuthRefreshResponse {
  accessToken: string;
}

interface RetryableAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  _skipAuthRefresh?: boolean;
}

export interface ApiErrorDetails {
  field?: string;
  message: string;
}

export class ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: ApiErrorDetails[] | Record<string, unknown>;

  constructor(
    message: string,
    statusCode?: number,
    details?: ApiErrorDetails[] | Record<string, unknown>,
    code?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
  }
}

interface ErrorResponseBody {
  message?: string;
  errors?: ApiErrorDetails[];
  error?: {
    code?: string;
    message?: string;
    details?: ApiErrorDetails[] | Record<string, unknown>;
  };
}

interface ApiEnvelope<TData> {
  success: boolean;
  data: TData;
  message?: string;
}

// Keep refresh cookies on the Web origin, including when the API is remote.
const API_BASE_URL = "/api/v1";
let getAccessToken: TokenGetter = () => null;
let setAccessToken: TokenSetter = () => undefined;
let clearSession: SessionClearer = () => undefined;
let refreshRequest: Promise<string> | null = null;

export function setApiTokenGetter(getter: TokenGetter) {
  getAccessToken = getter;
}

export function setApiAccessTokenSetter(setter: TokenSetter) {
  setAccessToken = setter;
}

export function setApiSessionClearer(clearer: SessionClearer) {
  clearSession = clearer;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const scope = financialMutationScope(
      response.config.url,
      response.config.method,
    );
    if (scope && typeof window !== "undefined")
      window.dispatchEvent(
        new CustomEvent(FINANCIAL_DATA_CHANGED, { detail: scope }),
      );
    return response;
  },
  async (error: AxiosError<ErrorResponseBody>) => {
    const originalConfig = error.config as
      RetryableAxiosRequestConfig | undefined;

    if (
      error.response?.status === 401 &&
      originalConfig &&
      !originalConfig._retry &&
      !originalConfig._skipAuthRefresh &&
      originalConfig.url !== "/auth/login" &&
      originalConfig.url !== "/auth/refresh" &&
      !originalConfig.url?.startsWith("/onboarding/invitations/")
    ) {
      originalConfig._retry = true;
      const tokenBeforeRefresh = getAccessToken();

      // A delayed 401 may belong to the session before the latest login/refresh.
      // Retry with the current token before attempting another cookie rotation.
      const sentAuthorization = originalConfig.headers?.Authorization;
      if (
        tokenBeforeRefresh &&
        sentAuthorization !== `Bearer ${tokenBeforeRefresh}`
      ) {
        originalConfig.headers = {
          ...originalConfig.headers,
          Authorization: `Bearer ${tokenBeforeRefresh}`,
        };
        return apiClient(originalConfig);
      }

      try {
        const refreshedToken = await refreshAccessToken();
        originalConfig.headers = {
          ...originalConfig.headers,
          Authorization: `Bearer ${refreshedToken}`,
        };
        return apiClient(originalConfig);
      } catch (refreshError) {
        if (getAccessToken() === tokenBeforeRefresh) clearSession();
        return Promise.reject(refreshError);
      }
    }

    const message =
      error.response?.data?.error?.message ??
      error.response?.data?.message ??
      error.message ??
      "Request failed";
    const details =
      error.response?.data?.error?.details ?? error.response?.data?.errors;
    return Promise.reject(
      new ApiError(
        message,
        error.response?.status,
        details,
        error.response?.data?.error?.code,
      ),
    );
  },
);

export async function refreshAccessToken() {
  const tokenAtStart = getAccessToken();
  refreshRequest ??= apiClient
    .post<ApiEnvelope<AuthRefreshResponse>>("/auth/refresh", undefined, {
      _skipAuthRefresh: true,
    } as RetryableAxiosRequestConfig)
    .then((response) => {
      const token = unwrapResponse<AuthRefreshResponse>(response).accessToken;
      // A login completed while refresh was pending; keep the newer session.
      if (getAccessToken() === tokenAtStart) {
        setAccessToken(token);
        return token;
      }
      const currentToken = getAccessToken();
      if (!currentToken) throw new ApiError("Session ended", 401);
      return currentToken;
    })
    .finally(() => {
      refreshRequest = null;
    });

  return refreshRequest;
}

function unwrapResponse<TData>(
  response: AxiosResponse<ApiEnvelope<TData> | TData>,
) {
  const payload = response.data;
  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    return payload.data;
  }
  return payload as TData;
}

export const api = {
  async get<TData>(url: string, config?: AxiosRequestConfig) {
    const response = await apiClient.get<ApiEnvelope<TData> | TData>(
      url,
      config,
    );
    return unwrapResponse<TData>(response);
  },
  async post<TData, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ) {
    const response = await apiClient.post<ApiEnvelope<TData> | TData>(
      url,
      body,
      config,
    );
    return unwrapResponse<TData>(response);
  },
  async put<TData, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ) {
    const response = await apiClient.put<ApiEnvelope<TData> | TData>(
      url,
      body,
      config,
    );
    return unwrapResponse<TData>(response);
  },
  async patch<TData, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ) {
    const response = await apiClient.patch<ApiEnvelope<TData> | TData>(
      url,
      body,
      config,
    );
    return unwrapResponse<TData>(response);
  },
  async delete<TData>(url: string, config?: AxiosRequestConfig) {
    const response = await apiClient.delete<ApiEnvelope<TData> | TData>(
      url,
      config,
    );
    return unwrapResponse<TData>(response);
  },
};
