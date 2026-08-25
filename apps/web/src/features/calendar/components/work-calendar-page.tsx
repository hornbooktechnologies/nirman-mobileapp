"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { WEEKDAYS, type EffectiveWorkCalendarDay, type Weekday, type WorkCalendarDayType, type WorkCalendarOverride, type WorkingWeek } from "@nirman-app/shared";
import { Button, Card, Checkbox, Dialog, EmptyState, Input, LoadingState, NotificationBanner, PageHeader, Select, StatusBadge, Textarea } from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useProjectAccess } from "@/features/projects/hooks/use-projects";
import { ApiError } from "@/lib/api/api-client";
import { type CalendarScope } from "@/features/calendar/services/calendar.service";
import { useCreateCalendarOverride, useOrganizationCalendar, useProjectCalendar, useRemoveCalendarOverride, useUpdateCalendarOverride, useUpdateOrganizationCalendar } from "@/features/calendar/hooks/use-calendar";

const weekdayLabels: Record<Weekday, string> = { MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday", THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday", SUNDAY: "Sunday" };
const sourceLabels = { PROJECT_OVERRIDE: "Project override", ORGANIZATION_OVERRIDE: "Organization override", WEEKLY_PATTERN: "Weekly pattern", UNCONFIGURED: "Not configured" } as const;
const dayLabels = { WORKING: "Normal working day", NON_WORKING: "Non-working day", SPECIAL_WORKING: "Special working day", UNCONFIGURED: "Not configured" } as const;
const dayTones = { WORKING: "active", NON_WORKING: "neutral", SPECIAL_WORKING: "warning", UNCONFIGURED: "inactive" } as const;

function todayMonth() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function monthRange(month: string) { const [year, value] = month.split("-").map(Number); return { startDate: `${month}-01`, endDate: `${month}-${String(new Date(year, value, 0).getDate()).padStart(2, "0")}` }; }
function shiftMonth(month: string, amount: number) { const [year, value] = month.split("-").map(Number); const next = new Date(year, value - 1 + amount, 1); return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`; }
function message(error: unknown) { return error instanceof ApiError ? error.message : "The request failed. Check your connection and try again."; }
type OverrideForm = { startDate: string; endDate: string; dayType: WorkCalendarDayType; name: string; reason: string };
const emptyOverride: OverrideForm = { startDate: "", endDate: "", dayType: "NON_WORKING", name: "", reason: "" };
const emptyWorkingWeek: Record<Weekday, boolean | null> = { MONDAY: null, TUESDAY: null, WEDNESDAY: null, THURSDAY: null, FRIDAY: null, SATURDAY: null, SUNDAY: null };

export function WorkCalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOrganizationId, hasPermission } = useAuth();
  const access = useProjectAccess(activeOrganizationId);
  const organization = useOrganizationCalendar(activeOrganizationId);
  const projects = useMemo(() => access.data?.projects ?? [], [access.data?.projects]);
  const requestedProjectId = searchParams.get("projectId") ?? "";
  const selectedProject = projects.find((item) => item.id === requestedProjectId) ?? null;
  const projectId = selectedProject?.id ?? "";
  const month = searchParams.get("month") ?? todayMonth();
  const range = useMemo(() => monthRange(month), [month]);
  const projectCalendar = useProjectCalendar(activeOrganizationId, projectId, range.startDate, range.endDate);
  const selectedPermissions: readonly string[] = selectedProject?.permissions ?? [];
  const canRead = hasPermission("work-calendar:read") || selectedPermissions.includes("work-calendar:read");
  const canUpdateOrganization =
    hasPermission("work-calendar:update-organization") ||
    selectedPermissions.includes("work-calendar:update-organization");
  const canUpdateProject = hasPermission("work-calendar:update-project") || selectedPermissions.includes("work-calendar:update-project");
  const [dialog, setDialog] = useState<{ scope: CalendarScope; item: WorkCalendarOverride | null } | null>(null);
  const [form, setForm] = useState<OverrideForm>(emptyOverride);
  const [formError, setFormError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [success, setSuccess] = useState("");
  const createOverride = useCreateCalendarOverride(activeOrganizationId, projectId);
  const updateOverride = useUpdateCalendarOverride(activeOrganizationId, projectId);
  const removeOverride = useRemoveCalendarOverride(activeOrganizationId, projectId);
  const pending = createOverride.isPending || updateOverride.isPending || removeOverride.isPending;

  function replaceQuery(updates: Record<string, string | null>) { const next = new URLSearchParams(searchParams.toString()); Object.entries(updates).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key)); router.replace(`/work-calendar?${next}`); }
  useEffect(() => { if (!access.isSuccess || projects.length === 0 || selectedProject) return; const fallback = projects.find((item) => item.isDefault) ?? projects[0]; const next = new URLSearchParams(searchParams.toString()); next.set("projectId", fallback.id); router.replace(`/work-calendar?${next}`); }, [access.isSuccess, projects, router, searchParams, selectedProject]);

  function openOverride(scope: CalendarScope, item: WorkCalendarOverride | null = null) { setDialog({ scope, item }); setForm(item ? { startDate: item.startDate, endDate: item.endDate, dayType: item.dayType, name: item.name, reason: item.reason ?? "" } : { ...emptyOverride, startDate: range.startDate, endDate: range.startDate }); setFormError(""); setConfirmRemove(false); }
  async function submit(event: FormEvent) { event.preventDefault(); if (!dialog) return; if (!form.startDate || !form.endDate || !form.name.trim()) { setFormError("Start date, end date, and name are required."); return; } if (form.endDate < form.startDate) { setFormError("End date must be on or after the start date."); return; } setFormError(""); const input = { startDate: form.startDate, endDate: form.endDate, dayType: form.dayType, name: form.name.trim(), reason: form.reason.trim() || null }; try { if (dialog.item) await updateOverride.mutateAsync({ scope: dialog.scope, overrideId: dialog.item.id, input }); else await createOverride.mutateAsync({ scope: dialog.scope, input }); setDialog(null); setSuccess(`${dialog.scope === "PROJECT" ? "Project" : "Organization"} calendar override saved.`); } catch (error) { setFormError(message(error)); } }
  async function remove() { if (!dialog?.item) return; setFormError(""); try { await removeOverride.mutateAsync({ scope: dialog.scope, overrideId: dialog.item.id }); setDialog(null); setSuccess("Calendar override removed."); } catch (error) { setFormError(message(error)); setConfirmRemove(false); } }

  if (!activeOrganizationId) return <div className="space-y-4"><PageHeader title="Work Calendar" description="Set the normal working week and date exceptions." /><EmptyState title="No active organization" description="Select an organization before opening Work Calendar." /></div>;
  if (!canRead) return <div className="space-y-4"><PageHeader title="Work Calendar" description="Set the normal working week and date exceptions." /><NotificationBanner variant="warning" title="Work Calendar access required" description="Ask an administrator for work-calendar:read permission." /></div>;

  const organizationOverrides = organization.data?.overrides ?? [];
  const projectOverrides = projectCalendar.data?.projectOverrides ?? [];
  return <div className="space-y-4 pb-8 text-base sm:text-[13px]">
    <PageHeader title="Work Calendar" description="Configure the normal working week once, then record only closures or special working dates." actions={<Link href={projectId ? `/attendance?projectId=${projectId}` : "/attendance"}><Button variant="outline"><CalendarDays size={16} aria-hidden="true" />Attendance</Button></Link>} />
    {success ? <div aria-live="polite"><NotificationBanner variant="success" title={success} onClose={() => setSuccess("")} /></div> : null}
    <Card padding="compact"><div className="grid gap-3 md:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-wide text-sub">Organization calendar</p><p className="mt-1 font-semibold">Normal working week and organization-wide dates</p></div><label className="grid gap-1.5 font-semibold">Project calendar<Select className="text-base sm:text-[13px]" value={projectId} disabled={!projects.length} onChange={(event) => replaceQuery({ projectId: event.target.value })}>{projects.length ? projects.map((item) => <option key={item.id} value={item.id}>{item.name}{item.projectCode ? ` · ${item.projectCode}` : ""}</option>) : <option value="">No accessible projects</option>}</Select></label></div></Card>

    {organization.isLoading ? <LoadingState label="Loading organization calendar" /> : organization.isError ? <NotificationBanner variant="danger" title="Organization calendar could not be loaded" description={message(organization.error)} action={<Button variant="outline" onClick={() => organization.refetch()}>Retry</Button>} /> : <WeeklySetup key={`${organization.data?.updatedAt ?? "unconfigured"}-${organization.data?.timezone ?? "none"}`} organizationId={activeOrganizationId} calendar={organization.data} canUpdate={canUpdateOrganization} onSaved={() => setSuccess("Normal working week saved.")} />}

    <OverrideSection title="Organization overrides" description="Dates that apply to every project unless a project override takes precedence." items={organizationOverrides} canUpdate={canUpdateOrganization} onAdd={() => openOverride("ORGANIZATION")} onEdit={(item) => openOverride("ORGANIZATION", item)} />

    {!projects.length ? <EmptyState title="No accessible projects" description="You can review the Organization calendar, but a Project calendar requires Project access." /> : !selectedProject ? <LoadingState label="Selecting an accessible project" /> : <>
      <Card padding="compact"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Effective project calendar</h2><p className="mt-1 text-sub">Project override &gt; Organization override &gt; Weekly pattern</p></div><div className="flex items-center gap-2"><Button variant="outline" aria-label="Previous month" onClick={() => replaceQuery({ month: shiftMonth(month, -1) })}><ChevronLeft size={16} aria-hidden="true" /></Button><Input className="w-40 text-base sm:text-[13px]" aria-label="Calendar month" type="month" value={month} onChange={(event) => replaceQuery({ month: event.target.value })} /><Button variant="outline" aria-label="Next month" onClick={() => replaceQuery({ month: shiftMonth(month, 1) })}><ChevronRight size={16} aria-hidden="true" /></Button></div></div></Card>
      {projectCalendar.isLoading ? <LoadingState label="Loading effective project calendar" /> : projectCalendar.isError ? <NotificationBanner variant="danger" title="Project calendar could not be loaded" description={message(projectCalendar.error)} action={<Button variant="outline" onClick={() => projectCalendar.refetch()}>Retry</Button>} /> : !projectCalendar.data?.configured ? <NotificationBanner variant="warning" title="Calendar not configured" description="The Organization working week must be configured before working dates can be determined." /> : <><NotificationBanner variant="info" title={projectOverrides.length ? "Project dates take precedence" : "Using Organization calendar"} description={projectOverrides.length ? "Project overrides are clearly labelled in the month below." : "No Project override changes this month."} /><MonthGrid month={month} days={projectCalendar.data.days} /></>}
      <OverrideSection title="Project overrides" description="Site-specific closures or special working dates for the selected project." items={projectOverrides} canUpdate={canUpdateProject} onAdd={() => openOverride("PROJECT")} onEdit={(item) => openOverride("PROJECT", item)} />
    </>}

    <Dialog open={Boolean(dialog)} onOpenChange={(open) => { if (!open && !pending) setDialog(null); }} title={`${dialog?.item ? "Edit" : "Add"} ${dialog?.scope === "PROJECT" ? "Project" : "Organization"} override`} description="Use one date range for a closure or special working period." footer={confirmRemove ? <><Button variant="outline" onClick={() => setConfirmRemove(false)} disabled={pending}>Keep override</Button><Button variant="danger" onClick={remove} disabled={pending}>{pending ? "Removing" : "Confirm removal"}</Button></> : <><Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>Cancel</Button>{dialog?.item ? <Button variant="danger" onClick={() => setConfirmRemove(true)} disabled={pending}>Remove</Button> : null}<Button type="submit" form="calendar-override-form" disabled={pending}>{pending ? "Saving" : dialog?.item ? "Update override" : "Save override"}</Button></>}>
      <form id="calendar-override-form" className="space-y-4" onSubmit={submit}>{formError ? <NotificationBanner variant="danger" title="Override was not saved" description={formError} /> : null}<div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 font-semibold">Start date<Input className="text-base sm:text-[13px]" type="date" value={form.startDate} onChange={(event) => setForm((value) => ({ ...value, startDate: event.target.value }))} /></label><label className="grid gap-1.5 font-semibold">End date<Input className="text-base sm:text-[13px]" type="date" value={form.endDate} onChange={(event) => setForm((value) => ({ ...value, endDate: event.target.value }))} /></label></div><label className="grid gap-1.5 font-semibold">Day type<Select className="text-base sm:text-[13px]" value={form.dayType} onChange={(event) => setForm((value) => ({ ...value, dayType: event.target.value as WorkCalendarDayType }))}><option value="NON_WORKING">Non-working</option><option value="SPECIAL_WORKING">Special working</option></Select></label><label className="grid gap-1.5 font-semibold">Name<Input className="text-base sm:text-[13px]" maxLength={160} value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} /></label><label className="grid gap-1.5 font-semibold">Reason <span className="font-normal text-sub">(Optional)</span><Textarea className="text-base sm:text-[13px]" maxLength={2000} value={form.reason} onChange={(event) => setForm((value) => ({ ...value, reason: event.target.value }))} /></label>{confirmRemove ? <NotificationBanner variant="warning" title="Remove this override?" description="The effective calendar will fall back to the next applicable source." /> : null}</form>
    </Dialog>
  </div>;
}

function WeeklySetup({ organizationId, calendar, canUpdate, onSaved }: { organizationId: string; calendar?: { configured: boolean; timezone: string; workingWeek: WorkingWeek | null; updatedAt: string | null }; canUpdate: boolean; onSaved: () => void }) {
  const updateCalendar = useUpdateOrganizationCalendar(organizationId);
  const [timezone, setTimezone] = useState(calendar?.timezone ?? "");
  const [workingWeek, setWorkingWeek] = useState<Record<Weekday, boolean | null>>(
    calendar?.workingWeek ? { ...calendar.workingWeek } : { ...emptyWorkingWeek },
  );
  const [timezoneError, setTimezoneError] = useState("");
  const [weekError, setWeekError] = useState("");
  const [apiError, setApiError] = useState("");

  async function saveWeek(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTimezone = timezone.trim();
    const hasUnselectedDay = WEEKDAYS.some((day) => typeof workingWeek[day] !== "boolean");
    setTimezoneError(normalizedTimezone ? "" : "Timezone is required.");
    setWeekError(hasUnselectedDay ? "Choose Working or Non-working for every weekday." : "");
    setApiError("");
    if (!normalizedTimezone || hasUnselectedDay) return;

    try {
      await updateCalendar.mutateAsync({
        timezone: normalizedTimezone,
        workingWeek: workingWeek as WorkingWeek,
      });
      onSaved();
    } catch (error) {
      setApiError(message(error));
    }
  }

  return <Card><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-semibold">Normal working week</h2><p className="mt-1 text-sub">One-time Organization setup. Every weekday can be working or non-working.</p></div><StatusBadge tone={calendar?.configured ? "active" : "warning"}>{calendar?.configured ? "Configured" : "Setup needed"}</StatusBadge></div>{canUpdate ? <form className="mt-5 space-y-4" onSubmit={saveWeek}>{apiError ? <NotificationBanner variant="danger" title="Working week was not saved" description={apiError} /> : null}<label className="grid max-w-sm gap-1.5 font-semibold">Timezone<Input className="text-base sm:text-[13px]" value={timezone} onChange={(event) => setTimezone(event.target.value)} onBlur={() => setTimezoneError(timezone.trim() ? "" : "Timezone is required.")} invalid={Boolean(timezoneError)} aria-describedby={timezoneError ? "weekly-timezone-error" : undefined} /></label>{timezoneError ? <p id="weekly-timezone-error" role="alert" className="text-sm text-danger">{timezoneError}</p> : null}<fieldset><legend className="font-semibold">Weekday pattern</legend><p className="mt-1 text-sub">Make an explicit choice for all seven days. Sunday has no automatic default.</p><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{WEEKDAYS.map((day) => <label key={day} className="grid gap-1.5 font-semibold">{weekdayLabels[day]}<Select className="text-base sm:text-[13px]" value={workingWeek[day] === null ? "" : String(workingWeek[day])} invalid={Boolean(weekError && workingWeek[day] === null)} onBlur={() => { if (workingWeek[day] === null) setWeekError("Choose Working or Non-working for every weekday."); }} onChange={(event) => { const value = event.target.value === "" ? null : event.target.value === "true"; setWorkingWeek((current) => ({ ...current, [day]: value })); if (value !== null) setWeekError(""); }}><option value="">Choose</option><option value="true">Working</option><option value="false">Non-working</option></Select></label>)}</div>{weekError ? <p role="alert" className="mt-2 text-sm text-danger">{weekError}</p> : null}</fieldset><div className="flex justify-end"><Button type="submit" disabled={updateCalendar.isPending}>{updateCalendar.isPending ? "Saving working week" : "Save working week"}</Button></div></form> : <>{calendar?.workingWeek ? <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{WEEKDAYS.map((day) => <Checkbox key={day} label={`${weekdayLabels[day]} · ${calendar.workingWeek?.[day] ? "Working" : "Non-working"}`} checked={calendar.workingWeek?.[day] ?? false} readOnly disabled />)}</div> : <p className="mt-4 text-sub">No weekday is assumed working or non-working until setup is completed.</p>}<NotificationBanner className="mt-5" variant="info" title="Read-only Organization calendar" description="An Organization calendar manager can change the normal working week." /></>}</Card>;
}
function OverrideSection({ title, description, items, canUpdate, onAdd, onEdit }: { title: string; description: string; items: WorkCalendarOverride[]; canUpdate: boolean; onAdd: () => void; onEdit: (item: WorkCalendarOverride) => void }) { return <Card><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-sub">{description}</p></div>{canUpdate ? <Button onClick={onAdd}><Plus size={16} aria-hidden="true" />Add override</Button> : null}</div>{items.length ? <div className="mt-4 divide-y divide-hairline rounded-inner border border-hairline">{items.map((item) => <div key={item.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{item.name}</p><p className="mt-0.5 text-sub"><span className="tabular-nums">{item.startDate}</span> to <span className="tabular-nums">{item.endDate}</span> · {item.dayType === "NON_WORKING" ? "Non-working" : "Special working"}</p>{item.reason ? <p className="mt-1 text-sub">{item.reason}</p> : null}</div>{canUpdate ? <Button variant="outline" onClick={() => onEdit(item)}><Pencil size={15} aria-hidden="true" />Edit</Button> : null}</div>)}</div> : <p className="mt-4 rounded-inner border border-dashed border-hairline p-4 text-sub">No overrides at this scope.</p>}</Card>; }
function MonthGrid({ month, days }: { month: string; days: EffectiveWorkCalendarDay[] }) { const [year, value] = month.split("-").map(Number); const offset = (new Date(year, value - 1, 1).getDay() + 6) % 7; return <Card padding="compact"><div className="space-y-2 sm:hidden">{days.map((day) => <div key={day.date} className="flex items-center justify-between gap-3 rounded-inner border border-hairline p-3"><div><p className="font-semibold tabular-nums">{day.date}</p><p className="mt-1 text-sm text-sub">{sourceLabels[day.source]}{day.override ? ` · ${day.override.name}` : ""}</p></div><StatusBadge className="shrink-0" tone={dayTones[day.dayType]}>{dayLabels[day.dayType]}</StatusBadge></div>)}</div><div className="hidden sm:block"><div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wide text-sub">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}</div><div className="mt-2 grid grid-cols-7 gap-1">{Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} />)}{days.map((day) => <DayCell key={day.date} day={day} />)}</div></div><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-sub"><span>Source labels: Project override</span><span>Organization override</span><span>Weekly pattern</span></div></Card>; }
function DayCell({ day }: { day: EffectiveWorkCalendarDay }) { return <div className="min-h-24 rounded-inner border border-hairline p-2"><p className="font-semibold tabular-nums">{Number(day.date.slice(-2))}</p><StatusBadge className="mt-2 max-w-full whitespace-normal text-left" tone={dayTones[day.dayType]}>{dayLabels[day.dayType]}</StatusBadge><p className="mt-1 text-[11px] leading-4 text-sub">{sourceLabels[day.source]}</p>{day.override ? <p className="mt-1 truncate text-[11px] font-medium" title={day.override.name}>{day.override.name}</p> : null}</div>; }
