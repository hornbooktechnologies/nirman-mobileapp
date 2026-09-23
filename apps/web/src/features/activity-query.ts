export function activityFilterHref(pathname: string, current: URLSearchParams, filters: Record<string, string | undefined>, keys: readonly string[]) {
  const next = new URLSearchParams(current);
  for (const key of [...keys, "page"]) next.delete(key);
  for (const [key, value] of Object.entries(filters)) if (value) next.set(key, value);
  return `${pathname}${next.size ? `?${next}` : ""}`;
}

export function galleryDayKey(capturedAt: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(capturedAt));
}

export function activityOrigin(pathname: string, current: URLSearchParams) {
  const next = new URLSearchParams(current);
  next.delete("returnTo");
  return `${pathname}${next.size ? `?${next}` : ""}`;
}

export function safeActivityReturn(value: string | null, projectId: string) {
  if (!value || value.includes("\\") || value.includes("#") || value.includes("//")) return null;
  const root = `/projects/${encodeURIComponent(projectId)}`;
  if (value === `${root}/progress` || value.startsWith(`${root}/progress?`) || value === `${root}/gallery` || value.startsWith(`${root}/gallery?`)) return value;
  const [path, query] = value.split("?");
  if ((path === "/work-calendar" || path === "/attendance") && new URLSearchParams(query).get("projectId") === projectId) return value;
  return null;
}
