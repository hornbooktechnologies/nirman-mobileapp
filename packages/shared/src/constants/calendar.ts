export const WORK_CALENDAR_DAY_TYPES = [
  "NON_WORKING",
  "SPECIAL_WORKING",
] as const;

export type WorkCalendarDayType = (typeof WORK_CALENDAR_DAY_TYPES)[number];

export const WORK_CALENDAR_OVERRIDE_SCOPES = [
  "ORGANIZATION",
  "PROJECT",
] as const;

export type WorkCalendarOverrideScope =
  (typeof WORK_CALENDAR_OVERRIDE_SCOPES)[number];

export const WEEKDAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export const EFFECTIVE_WORK_CALENDAR_DAY_TYPES = [
  "WORKING",
  "NON_WORKING",
  "SPECIAL_WORKING",
  "UNCONFIGURED",
] as const;

export type EffectiveWorkCalendarDayType =
  (typeof EFFECTIVE_WORK_CALENDAR_DAY_TYPES)[number];

export const WORK_CALENDAR_DAY_SOURCES = [
  "PROJECT_OVERRIDE",
  "ORGANIZATION_OVERRIDE",
  "WEEKLY_PATTERN",
  "UNCONFIGURED",
] as const;

export type WorkCalendarDaySource =
  (typeof WORK_CALENDAR_DAY_SOURCES)[number];
