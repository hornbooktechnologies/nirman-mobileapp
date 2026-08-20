export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "HALF_DAY",
  "ABSENT",
  "HOLIDAY",
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
