export const NOTIFICATION_IMPORTANCE = ["NORMAL", "HIGH", "URGENT"] as const;
export type NotificationImportance = (typeof NOTIFICATION_IMPORTANCE)[number];

export const PUSH_DEVICE_PLATFORMS = ["ANDROID", "IOS"] as const;
export type PushDevicePlatform = (typeof PUSH_DEVICE_PLATFORMS)[number];

export const NOTIFICATION_DELIVERY_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SENT",
  "RETRY",
  "FAILED",
] as const;
export type NotificationDeliveryStatus =
  (typeof NOTIFICATION_DELIVERY_STATUSES)[number];

export const NOTIFICATION_SUPPORTED_LOCALES = ["en", "hi", "gu"] as const;
export type NotificationLocale = (typeof NOTIFICATION_SUPPORTED_LOCALES)[number];
