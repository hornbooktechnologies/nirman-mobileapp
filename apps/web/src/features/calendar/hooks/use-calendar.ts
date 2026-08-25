"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { calendarService, type CalendarScope } from "@/features/calendar/services/calendar.service";
import type { CreateWorkCalendarOverrideInput, UpdateOrganizationWorkCalendarInput, UpdateWorkCalendarOverrideInput } from "@nirman-app/shared";

export const calendarKeys = {
  organization: (organizationId: string) => ["work-calendar", organizationId, "organization"] as const,
  project: (organizationId: string, projectId: string, startDate: string, endDate: string) => ["work-calendar", organizationId, "project", projectId, startDate, endDate] as const,
};
export function useOrganizationCalendar(organizationId: string | null) { return useQuery({ queryKey: calendarKeys.organization(organizationId ?? "none"), queryFn: () => calendarService.organization(organizationId!), enabled: Boolean(organizationId) }); }
export function useProjectCalendar(organizationId: string | null, projectId: string, startDate: string, endDate: string) { return useQuery({ queryKey: calendarKeys.project(organizationId ?? "none", projectId, startDate, endDate), queryFn: () => calendarService.project(organizationId!, projectId, startDate, endDate), enabled: Boolean(organizationId && projectId && startDate && endDate) }); }
function useInvalidate(organizationId: string | null) { const client = useQueryClient(); return () => client.invalidateQueries({ queryKey: ["work-calendar", organizationId ?? "none"] }); }
export function useUpdateOrganizationCalendar(organizationId: string | null) { const invalidate = useInvalidate(organizationId); return useMutation({ mutationFn: (input: UpdateOrganizationWorkCalendarInput) => calendarService.updateOrganization(organizationId!, input), onSuccess: invalidate }); }
export function useCreateCalendarOverride(organizationId: string | null, projectId: string) { const invalidate = useInvalidate(organizationId); return useMutation({ mutationFn: ({ scope, input }: { scope: CalendarScope; input: CreateWorkCalendarOverrideInput }) => calendarService.createOverride(organizationId!, projectId, scope, input), onSuccess: invalidate }); }
export function useUpdateCalendarOverride(organizationId: string | null, projectId: string) { const invalidate = useInvalidate(organizationId); return useMutation({ mutationFn: ({ scope, overrideId, input }: { scope: CalendarScope; overrideId: string; input: UpdateWorkCalendarOverrideInput }) => calendarService.updateOverride(organizationId!, projectId, scope, overrideId, input), onSuccess: invalidate }); }
export function useRemoveCalendarOverride(organizationId: string | null, projectId: string) { const invalidate = useInvalidate(organizationId); return useMutation({ mutationFn: ({ scope, overrideId }: { scope: CalendarScope; overrideId: string }) => calendarService.removeOverride(organizationId!, projectId, scope, overrideId), onSuccess: invalidate }); }
