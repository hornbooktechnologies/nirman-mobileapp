import Link from "next/link";
import { safeActivityReturn } from "./activity-query";

export function ProjectActivityNavigation({ projectId, permissions, current, date, origin, returnTo, onNavigate }: {
  projectId: string;
  permissions: readonly string[];
  current: "progress" | "gallery" | "calendar" | "attendance";
  date?: string;
  origin?: string;
  returnTo?: string | null;
  onNavigate?: () => boolean;
}) {
  const id = encodeURIComponent(projectId);
  const calendar = new URLSearchParams({ projectId, ...(date ? { month: date.slice(0, 7), selectedDate: date } : {}) });
  const attendance = new URLSearchParams({ projectId, ...(date ? { startDate: date, endDate: date } : {}) });
  const links = [
    { key: "progress", label: "Project progress", href: `/projects/${id}/progress`, permission: "progress:read" },
    { key: "gallery", label: "Project gallery", href: `/projects/${id}/gallery`, permission: "gallery:read" },
    { key: "calendar", label: "Work calendar", href: `/work-calendar?${calendar}`, permission: "work-calendar:read" },
    { key: "attendance", label: "Attendance", href: `/attendance?${attendance}`, permission: "attendance:read" },
  ] as const;
  const requestedBack = safeActivityReturn(returnTo ?? null, projectId);
  const backPath = requestedBack?.split("?")[0];
  const backPermission = backPath?.endsWith("/progress") ? "progress:read" : backPath?.endsWith("/gallery") ? "gallery:read" : backPath === "/work-calendar" ? "work-calendar:read" : "attendance:read";
  const back = requestedBack && permissions.includes(backPermission) ? requestedBack : null;
  const destination = (link: (typeof links)[number]) => {
    if (!origin) return link.href;
    if (link.key === current) return back ? `${origin}${origin.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(back)}` : origin;
    return `${link.href}${link.href.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(origin)}`;
  };
  return <nav aria-label="Project activity" className="flex flex-wrap gap-2 border-b border-hairline pb-3">
    {back ? <Link href={back} onClick={event => { if (onNavigate && !onNavigate()) event.preventDefault(); }} className="inline-flex min-h-11 items-center rounded-inner border border-hairline bg-surface px-4 text-sm font-medium underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime">Back to previous activity</Link> : null}
    {links.filter(link => permissions.includes(link.permission)).map(link => <Link key={link.key} href={destination(link)} aria-current={current === link.key ? "page" : undefined} onClick={event => { if (onNavigate && !onNavigate()) event.preventDefault(); }} className={`inline-flex min-h-11 items-center rounded-inner border border-hairline px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime ${current === link.key ? "bg-lime text-lime-ink" : "bg-surface text-body hover:bg-sunken"}`}>{link.label}</Link>)}
  </nav>;
}
