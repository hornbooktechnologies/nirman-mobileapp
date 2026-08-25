import i18n from 'i18next';

import { ApiRequestError } from '../lib/api';

const API_ERROR_KEYS = {
  AUTH_INVALID_CREDENTIALS: 'api.AUTH_INVALID_CREDENTIALS',
  AUTH_PASSWORD_WEAK: 'api.AUTH_PASSWORD_WEAK',
  AUTH_RATE_LIMITED: 'api.AUTH_RATE_LIMITED',
  AUTH_REFRESH_TOKEN_INVALID: 'api.AUTH_SESSION_REQUIRED',
  AUTH_REFRESH_TOKEN_REVOKED: 'api.AUTH_SESSION_REQUIRED',
  AUTH_SESSION_REQUIRED: 'api.AUTH_SESSION_REQUIRED',
  AUTH_TOKEN_EXPIRED: 'api.AUTH_SESSION_REQUIRED',
  ORG_ACCESS_DENIED: 'api.PERMISSION_DENIED',
  PERMISSION_DENIED: 'api.PERMISSION_DENIED',
  VALIDATION_FAILED: 'api.VALIDATION_FAILED',
  SERVER_ERROR: 'api.SERVER_ERROR',
  ATTENDANCE_EXCEPTION_DUPLICATE: 'api.ATTENDANCE_EXCEPTION_DUPLICATE',
  ATTENDANCE_NON_WORKING_DATE: 'api.ATTENDANCE_NON_WORKING_DATE',
  ATTENDANCE_PRIMARY_PROJECT_REQUIRED: 'api.ATTENDANCE_PRIMARY_PROJECT_REQUIRED',
  ATTENDANCE_WORKER_NOT_ASSIGNED: 'api.ATTENDANCE_WORKER_NOT_ASSIGNED',
  WORK_CALENDAR_NOT_CONFIGURED: 'api.WORK_CALENDAR_NOT_CONFIGURED',
  WORK_CALENDAR_DATE_RANGE_INVALID: 'api.WORK_CALENDAR_DATE_RANGE_INVALID',
  WORK_CALENDAR_OVERRIDE_CONFLICT: 'api.WORK_CALENDAR_OVERRIDE_CONFLICT',
  WORK_CALENDAR_TIMEZONE_INVALID: 'api.WORK_CALENDAR_TIMEZONE_INVALID',
} as const;

export function getLocalizedErrorMessage(error: unknown, fallbackMessage?: string): string {
  if (error instanceof ApiRequestError) {
    if (error.code && error.code in API_ERROR_KEYS) {
      const code = error.code as keyof typeof API_ERROR_KEYS;
      return i18n.t(API_ERROR_KEYS[code], { ns: 'errors' });
    }

    if (error.status === 401) return i18n.t('sessionExpired', { ns: 'errors' });
    if (error.status === 403) return i18n.t('permissionDenied', { ns: 'errors' });
    if (error.status >= 400 && error.status < 500) return i18n.t('validation', { ns: 'errors' });
    if (error.status >= 500) return i18n.t('server', { ns: 'errors' });
  }

  if (error instanceof TypeError) return i18n.t('network', { ns: 'errors' });
  return fallbackMessage ?? i18n.t('generic', { ns: 'errors' });
}
