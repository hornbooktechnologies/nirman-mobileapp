"use client";

import {
  PROJECT_PERMISSION_GROUPS,
  type PermissionKey,
  type ProjectMemberStatus,
  type ProjectPermissionMode,
} from "@nirman-app/shared";
import { Button, Checkbox, Select } from "@/components/ui";

const PROJECT_PERMISSION_LABELS: Partial<Record<PermissionKey, string>> = {
  "projects:read": "View project",
  "projects:update": "Edit project details",
  "projects:assign": "Manage project assignments",
  "projects:switch": "Switch to this project",
  "project-members:read": "View project team",
  "project-members:assign": "Assign organization members",
  "project-members:update": "Edit member assignments",
  "project-members:unassign": "End member assignments",
  "workers:read": "View workers",
  "workers:create": "Create workers",
  "workers:update": "Edit worker details",
  "workers:assign-project": "Allocate workers to projects",
  "workers:update-rate": "Update worker rates",
  "workers:deactivate": "Deactivate workers",
  "workers:export": "Export worker lists",
};

export function ProjectPermissionEditor({
  mode,
  permissions,
  rolePermissions,
  memberName,
  organizationRoleName,
  assignmentStatus = "ACTIVE",
  disabled = false,
  onChange,
}: {
  mode: ProjectPermissionMode;
  permissions: PermissionKey[];
  rolePermissions: PermissionKey[];
  memberName?: string;
  organizationRoleName?: string;
  assignmentStatus?: ProjectMemberStatus;
  disabled?: boolean;
  onChange: (value: {
    mode: ProjectPermissionMode;
    permissions: PermissionKey[];
  }) => void;
}) {
  const delegatable = PROJECT_PERMISSION_GROUPS.flatMap(
    (group) => group.permissions,
  ).filter(
    (permission, index, all) =>
      rolePermissions.includes(permission) && all.indexOf(permission) === index,
  );
  const subject = memberName || "This member";

  const selectedSummary = PROJECT_PERMISSION_GROUPS.map((group) => {
    const selected = group.permissions.filter((permission) =>
      permissions.includes(permission),
    );
    return selected.length
      ? `${group.label}: ${selected
          .map((permission) => PROJECT_PERMISSION_LABELS[permission] ?? permission)
          .join(", ")}`
      : null;
  }).filter((summary): summary is string => Boolean(summary));

  function preset(kind: "VIEW" | "MANAGE") {
    onChange({
      mode: "CUSTOM",
      permissions:
        kind === "MANAGE"
          ? delegatable
          : delegatable.filter(
              (permission) =>
                permission.endsWith(":read") || permission === "projects:switch",
            ),
    });
  }

  return (
    <div className="space-y-3 rounded-inner border border-hairline bg-sunken/30 p-3">
      <label className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-sub">
          Project permissions
        </span>
        <Select
          value={mode}
          disabled={disabled}
          onChange={(event) => {
            const nextMode = event.target.value as ProjectPermissionMode;
            onChange({
              mode: nextMode,
              permissions:
                nextMode === "ROLE_DEFAULT"
                  ? []
                  : permissions.length
                    ? permissions
                    : delegatable.filter(
                        (permission) =>
                          permission.endsWith(":read") ||
                          permission === "projects:switch",
                      ),
            });
          }}
        >
          <option value="ROLE_DEFAULT">All access allowed by organization role</option>
          <option value="CUSTOM">Custom for this project</option>
        </Select>
      </label>

      {mode === "CUSTOM" ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => preset("VIEW")}>
              Apply view-only access
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => preset("MANAGE")}>
              Apply all allowed access
            </Button>
          </div>
          <p className="text-[11px] leading-5 text-sub">
            Custom access can reduce the Organization Role permissions for this Project,
            but it cannot add permissions outside that role.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {PROJECT_PERMISSION_GROUPS.map((group) => {
              const groupPermissions = group.permissions.filter((permission) =>
                rolePermissions.includes(permission),
              );
              if (!groupPermissions.length) return null;
              return (
                <div key={group.key} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-sub">
                    {group.label}
                  </p>
                  {groupPermissions.map((permission) => (
                    <label key={permission} className="flex items-center gap-2 text-[12px] text-body">
                      <Checkbox
                        checked={permissions.includes(permission)}
                        disabled={disabled}
                        onChange={(event) =>
                          onChange({
                            mode,
                            permissions: event.currentTarget.checked
                              ? [...new Set([...permissions, permission])]
                              : permissions.filter((candidate) => candidate !== permission),
                          })
                        }
                      />
                      <span>{PROJECT_PERMISSION_LABELS[permission] ?? permission}</span>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
          {assignmentStatus === "ACTIVE" && !permissions.includes("projects:read") ? (
            <p className="text-[11px] text-red-600">
              Active custom access requires Project read permission.
            </p>
          ) : null}
          {assignmentStatus === "INACTIVE" ? (
            <p className="rounded-inner border border-hairline bg-surface p-3 text-[11px] leading-5 text-sub">
              This assignment is Inactive, so {subject} has no Project access. These
              permissions will apply only after the assignment is changed to Active.
            </p>
          ) : null}
          {selectedSummary.length ? (
            <div className="rounded-inner border border-hairline bg-surface p-3 text-[11px] leading-5 text-body">
              <p className="font-semibold">Access summary for {subject}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sub">
                {selectedSummary.map((summary) => (
                  <li key={summary}>{summary}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-[11px] leading-5 text-sub">
          {subject} will receive all Project permissions allowed by the
          {organizationRoleName ? ` ${organizationRoleName}` : " Organization"} Role.
          Choose Custom to narrow that access for this Project.
        </p>
      )}
    </div>
  );
}
