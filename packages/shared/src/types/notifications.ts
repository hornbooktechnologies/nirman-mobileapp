import type {
  NotificationImportance,
  NotificationLocale,
  PushDevicePlatform,
} from "../constants";

export type NotificationItem = {
  id: string;
  organizationId: string;
  projectId: string | null;
  userId: string;
  type: string;
  title: string;
  message: string;
  importance: NotificationImportance;
  referenceType: string | null;
  referenceId: string | null;
  deepLink: string | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationListResponse = {
  items: NotificationItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type NotificationSummary = {
  unreadCount: number;
};

export type PushDeviceRegistration = {
  id: string;
  platform: PushDevicePlatform;
  locale: NotificationLocale;
  active: boolean;
  lastRegisteredAt: string;
};
