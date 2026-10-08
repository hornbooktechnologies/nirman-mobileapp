export const canReadSales = (permissions: readonly string[]) =>
  ['leads:read-own', 'leads:read-team', 'leads:read-all'].some(p => permissions.includes(p));

export const assignmentPermission = (assignedTo: string | null) => assignedTo ? 'leads:reassign' : 'leads:assign';

export function canWriteLead(permissions: readonly string[], active: boolean, permission: string, lead: { assignedTo: string | null; createdBy: string }, user: string) {
  return active && permissions.includes(permission) && canReadSales(permissions) &&
    (permissions.includes('leads:read-all') || permissions.includes('leads:read-team') || lead.assignedTo === user || lead.createdBy === user);
}

export function localTime(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
  const part = (key: string) => parts.find(p => p.type === key)!.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

export function scheduleInstant(value: string, timezone: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const wall = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wall)) return null;
  let result = wall;
  for (let i = 0; i < 3; i++) result += wall - Date.parse(`${localTime(new Date(result).toISOString(), timezone)}:00Z`);
  return localTime(new Date(result).toISOString(), timezone) === value ? new Date(result).toISOString() : null;
}

export function dateRange(from: string, to: string, timezone: string) {
  const start = from ? scheduleInstant(`${from}T00:00`, timezone) : undefined;
  let end: string | undefined;
  if (to) {
    const next = new Date(`${to}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const midnight = scheduleInstant(`${next.toISOString().slice(0, 10)}T00:00`, timezone);
    if (midnight) end = new Date(Date.parse(midnight) - 1).toISOString();
  }
  return { from: start || undefined, to: end };
}

export const uncertainWrite = (status?: number) => !status || status >= 500 || status === 408;
export const callableNumber = (value: string) => /^\+?[\d\s()-]{7,24}$/.test(value) ? value.replace(/[^+\d]/g, '') : null;

export function eligibleBookingUnit(unit: { status: string; activeBlockId: string | null; blockedForLeadId: string | null; blockExpiresAt: string | null }, leadId: string, now = Date.now()) {
  return unit.status === 'AVAILABLE' || (unit.status === 'BLOCKED' && Boolean(unit.activeBlockId) && unit.blockedForLeadId === leadId && Boolean(unit.blockExpiresAt) && Date.parse(unit.blockExpiresAt!) > now);
}

export function retainBookingAttempt<T extends object>(previous: T | null, input: T): T {
  return previous ?? Object.freeze({ ...input });
}
