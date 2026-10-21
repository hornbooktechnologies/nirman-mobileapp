type SwitchableProject = {
  id: string;
  isDefault: boolean;
};

const QUERY_SCOPED_ROUTES = new Set([
  "/dashboard",
  "/workers",
  "/attendance",
  "/attendance/mark",
  "/work-calendar",
]);

const PROJECT_MODULE_ROUTES = new Set([
  "attendance",
  "expenses",
  "gallery",
  "kharchi",
  "materials",
  "progress",
  "team",
  "total-expenses",
  "wages",
]);

const LEGACY_PROJECT_ROUTES: Record<string, string> = {
  "/expenses": "expenses",
  "/gallery": "gallery",
  "/kharchi": "kharchi",
  "/materials": "materials",
  "/progress": "progress",
  "/total-expenses": "total-expenses",
  "/wages": "wages",
  "/sales/bookings": "sales/bookings",
  "/sales/follow-ups": "sales/follow-ups",
  "/sales/inventory": "sales/inventory",
  "/sales/leads": "sales/leads",
  "/sales/site-visits": "sales/site-visits",
};

export function projectIdFromLocation(
  pathname: string,
  params: URLSearchParams,
  projects: readonly SwitchableProject[],
  activeProjectId?: string | null,
) {
  const pathProjectId = pathname.match(/^\/projects\/([^/]+)(?:\/|$)/)?.[1];
  const requested = pathProjectId ? decodeURIComponent(pathProjectId) : params.get("projectId");
  if (requested && projects.some((project) => project.id === requested))
    return requested;
  if (
    activeProjectId &&
    projects.some((project) => project.id === activeProjectId)
  )
    return activeProjectId;
  return projects.find((project) => project.isDefault)?.id ?? projects[0]?.id ?? "";
}

export function projectSwitchHref(pathname: string, projectId: string) {
  const encodedId = encodeURIComponent(projectId);
  const projectRoute = pathname.match(/^\/projects\/[^/]+(?:\/(.*))?$/);
  if (projectRoute) {
    const tail = projectRoute[1] ?? "";
    const sales = tail.match(/^sales\/(leads|follow-ups|site-visits|inventory|bookings)(?:\/|$)/);
    if (sales) return `/projects/${encodedId}/sales/${sales[1]}`;
    const moduleRoute = tail.split("/")[0];
    if (PROJECT_MODULE_ROUTES.has(moduleRoute))
      return `/projects/${encodedId}/${moduleRoute}`;
    return `/projects/${encodedId}`;
  }

  if (QUERY_SCOPED_ROUTES.has(pathname))
    return `${pathname === "/attendance/mark" ? "/attendance" : pathname}?projectId=${encodedId}`;
  if (pathname.startsWith("/workers/"))
    return `/workers?projectId=${encodedId}`;
  const legacyModule = LEGACY_PROJECT_ROUTES[pathname];
  if (legacyModule) return `/projects/${encodedId}/${legacyModule}`;
  return `/projects/${encodedId}`;
}

export function accessibleProjectSwitchHref(
  pathname: string,
  projectId: string,
  availableHrefs: readonly string[],
) {
  const preferred = projectSwitchHref(pathname, projectId);
  if (pathname === "/dashboard") return preferred;
  return availableHrefs.includes(preferred)
    ? preferred
    : (availableHrefs[0] ?? "/projects");
}

