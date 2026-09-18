export const READ_LEADS = [
  "leads:read-own",
  "leads:read-team",
  "leads:read-all",
] as const;
export const canReadSales = (permissions: readonly string[]) =>
  READ_LEADS.some((p) => permissions.includes(p));
export const salesScope = (
  user?: string | null,
  org?: string | null,
  project?: string,
) => JSON.stringify([user, org, project]);
export const salesKey = (org: string, project: string) =>
  ["sales", org, project] as const;
export const assignmentPermission = (assignedTo: string | null) =>
  assignedTo ? "leads:reassign" : "leads:assign";
export const label = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (s) => s.toUpperCase());
export function canWriteLead(
  permissions: readonly string[],
  active: boolean,
  permission: string,
  lead: { assignedTo: string | null; createdBy: string },
  user: string,
) {
  return (
    active &&
    permissions.includes(permission) &&
    canReadSales(permissions) &&
    (permissions.includes("leads:read-all") ||
      permissions.includes("leads:read-team") ||
      lead.assignedTo === user ||
      lead.createdBy === user)
  );
}
export function localTime(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (key: string) => parts.find((p) => p.type === key)!.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
// Interpret a wall-clock input in the organization's timezone, never the browser timezone.
export function instant(value: string, timezone: string) {
  const wall = Date.parse(`${value}:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) || !Number.isFinite(wall))
    throw new Error("Enter a valid date and time.");
  let result = wall;
  for (let i = 0; i < 3; i++)
    result +=
      wall -
      Date.parse(`${localTime(new Date(result).toISOString(), timezone)}:00Z`);
  if (localTime(new Date(result).toISOString(), timezone) !== value)
    throw new Error(
      "This time does not exist in the working timezone. Choose another time.",
    );
  return new Date(result).toISOString();
}
export function failureMessage(error: unknown) {
  const e = error as { message?: string; statusCode?: number; code?: string };
  if (e.statusCode === 403)
    return "Access denied. Your project permissions or lead assignment may have changed. Refresh before continuing.";
  if (e.statusCode === 404)
    return "This record is no longer available in this project. Refresh the list.";
  if (!e.statusCode || e.statusCode >= 500)
    return `${e.message ?? "Request failed"} The outcome may be uncertain. Refresh and check the record or timeline before submitting again.`;
  return `${e.message ?? "Request failed"}${e.statusCode === 409 ? " Refresh and review the current record before submitting again." : ""}`;
}
