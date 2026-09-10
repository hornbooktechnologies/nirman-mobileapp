import type { NotificationListResponse, NotificationSummary, PushDeviceRegistration } from '@nirman-app/shared';
import { apiRequest } from '../../lib/api';

type Envelope<T> = { success: boolean; data: T };
const base = (organizationId: string) => `/organizations/${organizationId}/notifications`;
const data = async <T>(path: string, token: string, init: RequestInit = {}) => (await apiRequest<Envelope<T>>(path, init, { accessToken: token })).data;

export const fetchNotifications = (organizationId: string, token: string, page: number, unreadOnly: boolean) =>
  data<NotificationListResponse>(`${base(organizationId)}?page=${page}&pageSize=25&unreadOnly=${unreadOnly}`, token);
export const fetchNotificationSummary = (organizationId: string, token: string) => data<NotificationSummary>(`${base(organizationId)}/summary`, token);
export const markNotificationRead = (organizationId: string, notificationId: string, token: string) => data<{ id: string; read: true }>(`${base(organizationId)}/${notificationId}/read`, token, { method: 'POST' });
export const markAllNotificationsRead = (organizationId: string, token: string) => data<{ updated: number }>(`${base(organizationId)}/read-all`, token, { method: 'POST' });
export const registerPushDevice = (organizationId: string, token: string, input: { expoPushToken: string; platform: 'ANDROID' | 'IOS'; locale: 'en' | 'hi' | 'gu' }) => data<PushDeviceRegistration>(`${base(organizationId)}/devices`, token, { method: 'POST', body: JSON.stringify(input) });
export const deactivatePushDevice = (organizationId: string, deviceId: string, token: string) => data<{ id: string; active: false }>(`${base(organizationId)}/devices/${deviceId}`, token, { method: 'DELETE' });
