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

export function salesActivityDetails(activity: SalesActivity): Array<{ key: string; value: string }> {
  const values = activityDetails(activity.details);
  if (!values) return typeof activity.details === 'string' ? [{ key: 'notes', value: activity.details }] : [];
  const rows: Array<{ key: string; value: string }> = [];
  if (values.bookingId) rows.push({ key: 'bookingReference', value: activity.bookingReference || activity.bookingDate || '—' });
  if (activity.unitNumber) rows.push({ key: 'unit', value: activity.unitNumber });
  for (const key of ['details', 'source', 'from', 'to', 'restoredLeadStage', 'restoredUnitStatus', 'scheduledAt', 'type', 'outcome', 'notes', 'reason', 'status']) {
    const value = values[key];
    if (typeof value === 'string' && value) rows.push({ key, value });
  }
  for (const key of ['assignedFrom', 'assignedTo']) if (key in values) rows.push({ key, value: values[key] == null ? '—' : (key === 'assignedFrom' ? activity.assignedFromName : activity.assignedToName) || '—' });
  return rows;
}
