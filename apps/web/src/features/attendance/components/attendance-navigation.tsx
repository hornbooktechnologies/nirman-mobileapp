import Link from "next/link";

export function AttendanceNavigation({
  projectId,
  permissions,
  calendarDate,
  summaryHref,
  markHref,
  current,
  onNavigate,
}: {
  projectId: string;
  permissions: readonly string[];
  calendarDate?: string;
  summaryHref: string;
  markHref?: string;
  current: "summary" | "mark";
  onNavigate?: () => boolean;
}) {
  const links = [
    {
      label: "Attendance summary",
      href: summaryHref,
      visible: true,
      active: current === "summary",
    },
    {
      label: "Record absences",
      href: markHref ?? "",
      visible:
        Boolean(markHref) &&
        (permissions.includes("attendance:mark") ||
          permissions.includes("attendance:update")),
      active: current === "mark",
    },
    {
      label: "Project assignments",
      href: `/projects/${projectId}/team?tab=workers`,
      visible:
        permissions.includes("projects:read") &&
        permissions.includes("workers:read") &&
        permissions.includes("workers:assign-project"),
      active: false,
    },
    {
      label: "Work calendar",
      href: `/work-calendar?${new URLSearchParams({ projectId, ...(calendarDate ? { month: calendarDate.slice(0, 7) } : {}) })}`,
      visible: permissions.includes("work-calendar:read"),
      active: false,
    },
    {
      label: "Project progress",
      href: `/projects/${encodeURIComponent(projectId)}/progress`,
      visible: permissions.includes("progress:read"),
      active: false,
    },
    {
      label: "Project gallery",
      href: `/projects/${encodeURIComponent(projectId)}/gallery`,
      visible: permissions.includes("gallery:read"),
      active: false,
    },
  ];
  return (
    <nav
      aria-label="Attendance workspace"
      className="flex flex-wrap gap-2 border-b border-hairline pb-3"
    >
      {links
        .filter((link) => link.visible)
        .map((link) => (
          <Link
            key={link.label}
            aria-current={link.active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-inner border border-hairline px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime ${link.active ? "bg-lime text-lime-ink" : "bg-surface text-body hover:bg-sunken"}`}
            href={link.href}
            onClick={(event) => {
              if (onNavigate && !onNavigate()) event.preventDefault();
            }}
          >
            {link.label}
          </Link>
        ))}
    </nav>
  );
}
