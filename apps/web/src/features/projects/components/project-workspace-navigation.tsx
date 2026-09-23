import Link from "next/link";
import {
  projectNavigation,
  type ProjectNavigationContext,
} from "../project-navigation";
export function ProjectWorkspaceNavigation({
  project,
  overview = true,
  returnTo,
}: {
  project: ProjectNavigationContext;
  overview?: boolean;
  returnTo?: string;
}) {
  const links = projectNavigation(project).filter(
    (item) => overview || item.label !== "Project overview",
  );
  return (
    <nav
      aria-label="Project workspace"
      className="flex flex-wrap gap-2 border-b border-hairline pb-4"
    >
      {links.map((item) => (
        <Link
          key={item.label}
          className="inline-flex min-h-11 items-center rounded-inner border border-hairline bg-surface px-4 text-sm font-medium text-body hover:bg-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime"
          href={
            item.label === "Team" && returnTo
              ? `${item.href}?returnTo=${encodeURIComponent(returnTo)}`
              : item.href
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
