import type {
  EffectiveWorkCalendarDayType,
  Weekday,
  WorkCalendarDaySource,
  WorkCalendarDayType,
  WorkCalendarOverrideScope,
} from "../constants";

export type WorkingWeek = Record<Weekday, boolean>;

export type WorkCalendarOverride = {
  id: string;
  organizationId: string;
  projectId: string | null;
  scope: WorkCalendarOverrideScope;
  startDate: string;
  endDate: string;
  dayType: WorkCalendarDayType;
  name: string;
  reason: string | null;
  source: "MANUAL";
  createdAt: string;
  updatedAt: string;
};

export type OrganizationWorkCalendar = {
  organizationId: string;
  configured: boolean;
  timezone: string;
  workingWeek: WorkingWeek | null;
  overrides: WorkCalendarOverride[];
  updatedAt: string | null;
};

export type UpdateOrganizationWorkCalendarInput = {
  timezone: string;
  workingWeek: WorkingWeek;
};

export type CreateWorkCalendarOverrideInput = {
  startDate: string;
  endDate: string;
  dayType: WorkCalendarDayType;
  name: string;
  reason?: string | null;
};

export type UpdateWorkCalendarOverrideInput =
  Partial<CreateWorkCalendarOverrideInput>;

export type EffectiveWorkCalendarDay = {
  date: string;
  configured: boolean;
  isWorking: boolean | null;
  dayType: EffectiveWorkCalendarDayType;
  source: WorkCalendarDaySource;
  override: WorkCalendarOverride | null;
};

export type EffectiveProjectWorkCalendarResponse = {
  organizationId: string;
  projectId: string;
  timezone: string;
  configured: boolean;
  workingWeek: WorkingWeek | null;
  startDate: string;
  endDate: string;
  organizationOverrides: WorkCalendarOverride[];
  projectOverrides: WorkCalendarOverride[];
  days: EffectiveWorkCalendarDay[];
};
