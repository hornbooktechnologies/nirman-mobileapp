import { Card, FieldLabel, Select, StatusBadge } from "@/components/ui";
import type { ProjectAccess } from "@/features/projects/types/projects.types";
const tones = {
  ACTIVE: "active",
  DRAFT: "pending",
  ON_HOLD: "warning",
  COMPLETED: "success",
  ARCHIVED: "inactive",
} as const;
export function ProjectPortfolio({
  projects,
  selectedId,
  onSelect,
}: {
  projects: ProjectAccess["projects"];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const selected = projects.find((project) => project.id === selectedId);
  return (
    <Card className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <FieldLabel htmlFor="dashboard-project">Project context</FieldLabel>
          <Select
            id="dashboard-project"
            value={selectedId}
            onChange={(event) => onSelect(event.target.value)}
            disabled={!projects.length}
          >
            <option value="" disabled>
              Choose an accessible project
            </option>
            {projects.map((project) => (
              <option value={project.id} key={project.id}>
                {project.name}
                {project.projectCode ? ` · ${project.projectCode}` : ""}
                {project.status === "ARCHIVED" ? " (Archived)" : ""}
              </option>
            ))}
          </Select>
        </div>
        {selected ? (
          <StatusBadge tone={tones[selected.status]}>
            {selected.status.replaceAll("_", " ").toLowerCase()}
          </StatusBadge>
        ) : null}
      </div>
      <p className="text-[13px] text-sub">
        All summaries and shortcuts below use this project. Changing it does not
        change assignments or permissions.
      </p>
    </Card>
  );
}
