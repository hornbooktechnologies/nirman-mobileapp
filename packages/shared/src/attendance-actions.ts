import type { AttendanceSummaryRow } from './types/attendance';

export function attendancePeriodIssue(start: string, end: string): 'date' | 'order' | 'limit' | undefined {
  const valid = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  if (!valid(start) || !valid(end)) return 'date';
  if (end < start) return 'order';
  if ((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86400000 >= 366) return 'limit';
}

/** Client visibility only; API access and calendar/assignment validation remain authoritative. */
export function attendanceRowActions(
  selectedDate: AttendanceSummaryRow['selectedDate'],
  permissions: readonly string[],
) {
  const read = permissions.includes('attendance:read');
  const update = read && permissions.includes('attendance:update');
  const hasException = Boolean(selectedDate?.exception);
  return {
    mark: read && !hasException && selectedDate?.state === 'PRESENT' && permissions.includes('attendance:mark'),
    edit: update && hasException && selectedDate?.state !== 'NON_WORKING',
    restore: update && hasException,
  };
}
