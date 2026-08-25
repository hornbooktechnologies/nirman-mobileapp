export const ATTENDANCE_EXCEPTION_TYPES = ["ABSENCE"] as const;

export type AttendanceExceptionType =
  (typeof ATTENDANCE_EXCEPTION_TYPES)[number];

export const ATTENDANCE_DURATIONS = ["FULL_DAY", "HALF_DAY"] as const;

export type AttendanceDuration = (typeof ATTENDANCE_DURATIONS)[number];

export const DERIVED_ATTENDANCE_STATES = [
  "PRESENT",
  "HALF_DAY",
  "ABSENT",
  "NON_WORKING",
] as const;

export type DerivedAttendanceState =
  (typeof DERIVED_ATTENDANCE_STATES)[number];

/** @deprecated Compatibility contract for Web/Mobile until Slices B/C migrate. */
export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "HALF_DAY",
  "ABSENT",
  "HOLIDAY",
] as const;

/** @deprecated Compatibility contract for Web/Mobile until Slices B/C migrate. */
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
