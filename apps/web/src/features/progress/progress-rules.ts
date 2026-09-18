export const progressKey = (org: string, project: string) => ["progress", org, project] as const;
export const progressScope = (user?: string, org?: string | null, project?: string) => JSON.stringify([user, org, project]);
export function progressProject<T extends { id: string; permissions: readonly string[] }>(projects: T[], id: string) {
  return projects.find(p => p.id === id && p.permissions.includes("progress:read"));
}
export const canUpdateProgress = (permissions: readonly string[], active: boolean) => active && permissions.includes("progress:update");
export const stageLabel = (stage: string) => stage.charAt(0) + stage.slice(1).toLowerCase();
export function todayInIndia(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(type => parts.find(p => p.type === type)?.value).join("-");
}
export function updateErrors(percentage: string, date: string, notes: string, previous: number | null, today: string) {
  return {
    percentage: !/^\d+(\.\d{1,2})?$/.test(percentage) || Number(percentage) > 100 ? "Enter a percentage from 0 to 100 with up to two decimals." : "",
    date: !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date > today ? "Enter a valid date no later than today in India." : "",
    notes: notes.trim().length > 2000 ? "Use at most 2,000 characters." : previous !== null && Number(percentage) < previous && !notes.trim() ? "Explain why this stage percentage decreased." : "",
  };
}
export function retainAttempt<T>(previous: (T & { idempotencyKey: string }) | null, input: T, key: () => string): T & { idempotencyKey: string } {
  return previous ?? { ...input, idempotencyKey: key() };
}
export function failureKind(status?: number) {
  return status === 409 ? "stale" : !status || status === 408 || status >= 500 ? "uncertain" : status === 401 || status === 403 ? "denied" : "rejected";
}
