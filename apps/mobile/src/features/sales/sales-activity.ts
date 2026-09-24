import type { SalesActivity } from './types';

function activityDetails(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== 'string') return null;

  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export function salesActivityDisplayAt(activity: SalesActivity) {
  if (activity.activityType !== 'FOLLOW_UP_SCHEDULED') return activity.occurredAt;

  const scheduledAt = activityDetails(activity.details)?.scheduledAt;
  return typeof scheduledAt === 'string' && !Number.isNaN(Date.parse(scheduledAt))
    ? scheduledAt
    : activity.occurredAt;
}
