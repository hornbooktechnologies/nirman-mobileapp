import { api } from "@/lib/api/api-client";
import type { CreateWorkCalendarOverrideInput, EffectiveProjectWorkCalendarResponse, OrganizationWorkCalendar, UpdateOrganizationWorkCalendarInput, UpdateWorkCalendarOverrideInput, WorkCalendarOverride } from "@nirman-app/shared";

export type CalendarScope = "ORGANIZATION" | "PROJECT";
function organizationPath(organizationId: string) { return `/organizations/${organizationId}/work-calendar`; }
function projectPath(organizationId: string, projectId: string) { return `/organizations/${organizationId}/projects/${projectId}/work-calendar`; }
function scopePath(organizationId: string, projectId: string, scope: CalendarScope) { return scope === "PROJECT" ? projectPath(organizationId, projectId) : organizationPath(organizationId); }

export const calendarService = {
  organization(organizationId: string) { return api.get<OrganizationWorkCalendar>(organizationPath(organizationId)); },
  updateOrganization(organizationId: string, input: UpdateOrganizationWorkCalendarInput) { return api.patch<OrganizationWorkCalendar, UpdateOrganizationWorkCalendarInput>(organizationPath(organizationId), input); },
  project(organizationId: string, projectId: string, startDate: string, endDate: string) { const params = new URLSearchParams({ startDate, endDate }); return api.get<EffectiveProjectWorkCalendarResponse>(`${projectPath(organizationId, projectId)}?${params}`); },
  createOverride(organizationId: string, projectId: string, scope: CalendarScope, input: CreateWorkCalendarOverrideInput) { return api.post<WorkCalendarOverride, CreateWorkCalendarOverrideInput>(`${scopePath(organizationId, projectId, scope)}/overrides`, input); },
  updateOverride(organizationId: string, projectId: string, scope: CalendarScope, overrideId: string, input: UpdateWorkCalendarOverrideInput) { return api.patch<WorkCalendarOverride, UpdateWorkCalendarOverrideInput>(`${scopePath(organizationId, projectId, scope)}/overrides/${overrideId}`, input); },
  removeOverride(organizationId: string, projectId: string, scope: CalendarScope, overrideId: string) { return api.delete<{ id: string; removed: true }>(`${scopePath(organizationId, projectId, scope)}/overrides/${overrideId}`); },
};
