export type SalesTone = "neutral" | "active" | "pending" | "inactive" | "success" | "warning" | "danger" | "info" | "purple";

// Sales states describe different domains; a positive customer signal is not a failure.
export function salesTone(value: string): SalesTone {
  if (["AVAILABLE", "APPROVED", "COMPLETED", "SITE_VISIT_COMPLETED", "CONFIRMED"].includes(value)) return "success";
  if (["BOOKED", "SOLD", "CONVERTED"].includes(value)) return "purple";
  if (["HIGH_INTENT", "SELECTED", "QUALIFIED", "NEGOTIATION", "UNIT_BLOCKED"].includes(value)) return "active";
  if (["SCHEDULED", "CONTACTED", "SITE_VISIT_SCHEDULED", "FOLLOW_UP_LATER", "PENDING", "INTERESTED", "NEW"].includes(value)) return "info";
  if (["BLOCKED", "WAITLISTED", "RESCHEDULED", "UNAVAILABLE", "EXPIRED"].includes(value)) return "warning";
  if (["CANCELLED", "LOST", "INVALID", "REJECTED", "MISSED", "NO_SHOW", "NOT_INTERESTED", "WITHDRAWN"].includes(value)) return "danger";
  if (["DUPLICATE", "RELEASED"].includes(value)) return "inactive";
  return "neutral";
}

export function salesListUrl(pathname: string, params: { toString(): string }, updates: Record<string, string>, clear: string[] = []) {
  const next = new URLSearchParams(params.toString());
  for (const key of clear) next.delete(key);
  for (const [key, value] of Object.entries(updates)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function salesDetailUrl(path: string, listUrl: string) {
  return `${path}?returnTo=${encodeURIComponent(listUrl)}`;
}

export function safeSalesReturn(value: string | null, projectId: string, section: "leads" | "follow-ups" | "site-visits" | "inventory" | "bookings") {
  const base = `/projects/${projectId}/sales/${section}`;
  if (value === base) return base;
  if (!value || !value.startsWith(`${base}?`)) return base;
  const suffix = value.slice(base.length + 1);
  const params = new URLSearchParams(suffix);
  if (params.has("returnTo") || params.has("visit")) return base;
  return `${base}?${params.toString()}`;
}

export function safeLeadReturn(value: string | null, projectId: string) {
  const related = safeSalesRecordReturn(value, projectId, ["bookings", "inventory"]);
  if (related) return related;
  for (const section of ["leads", "follow-ups", "site-visits"] as const) {
    const base = `/projects/${projectId}/sales/${section}`;
    if (value === base || value?.startsWith(`${base}?`)) return safeSalesReturn(value, projectId, section);
  }
  return `/projects/${projectId}/sales/leads`;
}

export function safeSalesRecordReturn(value: string | null, projectId: string, sections: readonly ("leads" | "inventory" | "bookings")[]) {
  if (!value?.startsWith("/") || value.startsWith("//")) return null;
  const match = /^\/projects\/([^/?#]+)\/sales\/(leads|inventory|bookings)\/([a-zA-Z0-9-]{1,80})(?:\?([^#]*))?$/.exec(value);
  if (!match || match[1] !== projectId || !sections.includes(match[2] as "leads" | "inventory" | "bookings")) return null;
  const params = new URLSearchParams(match[4] ?? "");
  if ([...params.keys()].some((key) => key !== "returnTo" && key !== "created")) return null;
  const nested = params.get("returnTo");
  if (nested) {
    const nestedSection = match[2] as "leads" | "inventory" | "bookings";
    const possibleSections = nestedSection === "leads" ? ["leads", "follow-ups", "site-visits"] as const : [nestedSection];
    if (!possibleSections.some((section) => safeSalesReturn(nested, projectId, section) === nested)) return null;
  }
  return value;
}
