export type ProjectNavigationContext = {
  id: string;
  permissions: readonly string[];
  status: string;
};
export function projectNavigation(project: ProjectNavigationContext) {
  const base = `/projects/${encodeURIComponent(project.id)}`;
  const can = (key: string) => project.permissions.includes(key);
  const sales = ["leads:read-own", "leads:read-team", "leads:read-all"].some(
    can,
  );
  return [
    { label: "Project overview", href: base, allowed: can("projects:read") },
    {
      label: "Team",
      href: `${base}/team`,
      allowed:
        can("projects:read") &&
        (can("project-members:read") || can("workers:read")),
    },
    {
      label: "Workers",
      href: `/workers?projectId=${encodeURIComponent(project.id)}`,
      allowed: can("workers:read"),
    },
    {
      label: "Attendance",
      href: `/attendance?projectId=${encodeURIComponent(project.id)}`,
      allowed: can("attendance:read"),
    },
    {
      label: "Work calendar",
      href: `/work-calendar?projectId=${encodeURIComponent(project.id)}`,
      allowed: can("work-calendar:read"),
    },
    ...[
      ["Wages", "wages", "wages:read"],
      ["Kharchi", "kharchi", "kharchi:read"],
      ["Materials", "materials", "materials:read"],
      ["Site expenses", "expenses", "expenses:read"],
      ["Progress", "progress", "progress:read"],
      ["Gallery", "gallery", "gallery:read"],
    ].map(([label, route, permission]) => ({
      label,
      href: `${base}/${route}`,
      allowed: can(permission),
    })),
    { label: "Sales leads", href: `${base}/sales/leads`, allowed: sales },
    {
      label: "Follow-ups",
      href: `${base}/sales/follow-ups`,
      allowed: sales,
    },
    {
      label: "Site visits",
      href: `${base}/sales/site-visits`,
      allowed: sales,
    },
    {
      label: "Inventory",
      href: `${base}/sales/inventory`,
      allowed: can("inventory:read"),
    },
    { label: "Bookings", href: `${base}/sales/bookings`, allowed: sales },
  ].filter((item) => item.allowed);
}
export function scopedNavigationHref(href: string, projectId: string) {
  const id = encodeURIComponent(projectId);
  if (
    ["/dashboard", "/workers", "/attendance", "/work-calendar"].includes(href)
  )
    return `${href}?projectId=${id}`;
  if (
    [
      "/wages",
      "/kharchi",
      "/expenses",
      "/gallery",
      "/materials",
      "/progress",
      "/sales/bookings",
      "/sales/inventory",
      "/sales/leads",
      "/sales/site-visits",
      "/sales/follow-ups",
    ].includes(href)
  )
    return `/projects/${id}${href}`;
  return href;
}
