"use client";

import { useMemo, useState } from "react";
import { CalendarDays, FolderKanban } from "lucide-react";
import {
  PROJECT_PERMISSION_GROUPS,
  PROJECT_MEMBER_STATUSES,
  type PermissionKey,
  type ProjectMemberStatus,
  type ProjectPermissionMode,
  type ProjectStatus,
} from "@nirman-app/shared";
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  Input,
  Select,
} from "@/components/ui";
import { useSaveMemberProjectAssignments } from "@/features/projects/hooks/use-projects";
import type {
  OrganizationProjectAssignment,
  OrganizationProjectAssignmentsOverview,
} from "@/features/projects/types/projects.types";
import type { OrganizationMember } from "@/features/organizations/types/organizations.types";
import { ApiError } from "@/lib/api/api-client";

interface AssignmentFields {
  roleLabel: string;
  permissionMode: ProjectPermissionMode;
  permissions: PermissionKey[];
  status: ProjectMemberStatus;
  startsOn: string;
  endsOn: string;
}

function toDateInput(value: string | null) {
  return value?.slice(0, 10) ?? "";
}

function isWritableProject(status: ProjectStatus) {
  return status !== "ARCHIVED" && status !== "COMPLETED";
}

function initialFields(assignment?: OrganizationProjectAssignment): AssignmentFields {
  return {
    roleLabel: assignment?.roleLabel ?? "",
    permissionMode: assignment?.permissionMode ?? "ROLE_DEFAULT",
    permissions: assignment?.grantedPermissions ?? [],
    status: assignment?.status ?? "ACTIVE",
    startsOn: toDateInput(assignment?.startsOn ?? null),
    endsOn: toDateInput(assignment?.endsOn ?? null),
  };
}

export function MemberProjectAssignmentDialog({
  organizationId,
  member,
  overview,
  onClose,
  rolePermissions,
}: {
  organizationId: string;
  member: OrganizationMember;
  overview: OrganizationProjectAssignmentsOverview;
  onClose: () => void;
  rolePermissions: PermissionKey[];
}) {
  const memberAssignments = useMemo(
    () =>
      overview.assignments.filter(
        (assignment) => assignment.memberId === member.id,
      ),
    [member.id, overview.assignments],
  );
  const initialAssignmentByProject = useMemo(
    () =>
      new Map(
        memberAssignments.map((assignment) => [
          assignment.projectId,
          assignment,
        ]),
      ),
    [memberAssignments],
  );
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(
    memberAssignments.map((assignment) => assignment.projectId),
  );
  const [fieldsByProject, setFieldsByProject] = useState<
    Record<string, AssignmentFields>
  >(() =>
    Object.fromEntries(
      overview.projects.map((project) => [
        project.id,
        initialFields(initialAssignmentByProject.get(project.id)),
      ]),
    ),
  );
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const saveAssignments = useSaveMemberProjectAssignments(
    organizationId,
    member.id,
  );
  const visibleProjects = overview.projects.filter((project) => {
    const needle = search.trim().toLowerCase();
    return (
      !needle ||
      project.name.toLowerCase().includes(needle) ||
      project.projectCode?.toLowerCase().includes(needle)
    );
  });
  const selectedProjects = overview.projects.filter((project) =>
    selectedProjectIds.includes(project.id),
  );

  function toggleProject(projectId: string, checked: boolean) {
    setSelectedProjectIds((current) =>
      checked
        ? current.includes(projectId)
          ? current
          : [...current, projectId]
        : current.filter((id) => id !== projectId),
    );
  }

  function updateFields(
    projectId: string,
    updates: Partial<AssignmentFields>,
  ) {
    setFieldsByProject((current) => ({
      ...current,
      [projectId]: { ...current[projectId], ...updates },
    }));
  }

  const delegatableRolePermissions = useMemo(
    () =>
      PROJECT_PERMISSION_GROUPS.flatMap((group) => group.permissions).filter(
        (permission, index, permissions) =>
          rolePermissions.includes(permission) &&
          permissions.indexOf(permission) === index,
      ),
    [rolePermissions],
  );

  function setPermissionPreset(
    projectId: string,
    preset: "VIEW" | "MANAGE",
  ) {
    const permissions =
      preset === "MANAGE"
        ? delegatableRolePermissions
        : delegatableRolePermissions.filter(
            (permission) =>
              permission.endsWith(":read") || permission === "projects:switch",
          );
    updateFields(projectId, {
      permissionMode: "CUSTOM",
      permissions,
    });
  }

  function togglePermission(
    projectId: string,
    permission: PermissionKey,
    checked: boolean,
  ) {
    const current = fieldsByProject[projectId].permissions;
    updateFields(projectId, {
      permissions: checked
        ? [...new Set([...current, permission])]
        : current.filter((candidate) => candidate !== permission),
    });
  }

  async function save() {
    setError(null);
    const invalidDateProject = selectedProjects.find((project) => {
      const fields = fieldsByProject[project.id];
      return fields.startsOn && fields.endsOn && fields.endsOn < fields.startsOn;
    });
    if (invalidDateProject) {
      setError(`End date cannot be before start date for ${invalidDateProject.name}.`);
      return;
    }

    const writableSelectedProjects = selectedProjects.filter((project) =>
      isWritableProject(project.status),
    );
    const unassignProjectIds = memberAssignments
      .filter(
        (assignment) =>
          !selectedProjectIds.includes(assignment.projectId) &&
          isWritableProject(assignment.project.status),
      )
      .map((assignment) => assignment.projectId);

    try {
      await saveAssignments.mutateAsync({
        assignments: writableSelectedProjects.map((project) => {
          const fields = fieldsByProject[project.id];
          return {
            projectId: project.id,
            roleLabel: fields.roleLabel.trim() || null,
            permissionMode: fields.permissionMode,
            permissions:
              fields.permissionMode === "CUSTOM" ? fields.permissions : [],
            status: fields.status,
            startsOn: fields.startsOn || null,
            endsOn: fields.endsOn || null,
          };
        }),
        unassignProjectIds,
      });
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof ApiError
          ? saveError.message
          : "Unable to save project assignments",
      );
    }
  }

  return (
    <Dialog
      open
      title={`Project access · ${member.user?.name ?? "Member"}`}
      description="Select projects, then set the assignment details for each selected project."
      className="max-w-3xl"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saveAssignments.isPending}>
            {saveAssignments.isPending ? "Saving" : "Save Assignments"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-body">Select projects</h3>
              <p className="text-[12px] text-sub">
                {selectedProjectIds.length} selected
              </p>
            </div>
            <Input
              className="max-w-[280px]"
              placeholder="Search projects"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="grid max-h-52 gap-2 overflow-y-auto rounded-inner border border-hairline bg-sunken/30 p-3 sm:grid-cols-2">
            {visibleProjects.map((project) => {
              const writable = isWritableProject(project.status);
              const assigned = initialAssignmentByProject.has(project.id);
              return (
                <label
                  key={project.id}
                  className="flex items-start gap-3 rounded-sub border border-hairline/70 bg-surface p-3"
                >
                  <Checkbox
                    checked={selectedProjectIds.includes(project.id)}
                    disabled={!writable}
                    onChange={(event) =>
                      toggleProject(project.id, event.currentTarget.checked)
                    }
                    aria-label={`Select ${project.name}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-body">
                      {project.name}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-sub">
                      {project.projectCode ? <span>{project.projectCode}</span> : null}
                      <Badge variant={writable ? "outline" : "warning"}>
                        {project.status}
                      </Badge>
                      {assigned ? <Badge variant="info">Assigned</Badge> : null}
                    </span>
                  </span>
                </label>
              );
            })}
            {visibleProjects.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-sub sm:col-span-2">
                No projects match your search.
              </p>
            ) : null}
          </div>
          <p className="mt-2 text-[11px] text-sub">
            Completed and archived projects are shown for context but cannot be changed.
          </p>
        </section>

        {selectedProjects.length > 0 ? (
          <section className="space-y-3">
            <div>
              <h3 className="font-semibold text-body">Assignment details</h3>
              <p className="text-[12px] text-sub">
                Dates and project responsibility can differ by project.
              </p>
            </div>
            {selectedProjects.map((project) => {
              const fields = fieldsByProject[project.id];
              const writable = isWritableProject(project.status);
              return (
                <div
                  key={project.id}
                  className="rounded-inner border border-hairline bg-surface p-4"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <FolderKanban size={16} className="text-lime" />
                    <h4 className="font-semibold text-body">{project.name}</h4>
                    {!writable ? <Badge variant="warning">Read only</Badge> : null}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-sub">
                        Role on this project
                      </span>
                      <Input
                        placeholder="Optional, e.g. Site Supervisor"
                        value={fields.roleLabel}
                        disabled={!writable}
                        onChange={(event) =>
                          updateFields(project.id, {
                            roleLabel: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-sub">
                        Project permissions
                      </span>
                      <Select
                        value={fields.permissionMode}
                        disabled={!writable}
                        onChange={(event) =>
                          updateFields(project.id, {
                            permissionMode: event.target
                              .value as ProjectPermissionMode,
                            permissions:
                              event.target.value === "ROLE_DEFAULT"
                                ? []
                                : fields.permissions.length
                                  ? fields.permissions
                                  : delegatableRolePermissions.filter(
                                      (permission) =>
                                        permission.endsWith(":read") ||
                                        permission === "projects:switch",
                                    ),
                          })
                        }
                      >
                        <option value="ROLE_DEFAULT">Use organization role defaults</option>
                        <option value="CUSTOM">Custom for this project</option>
                      </Select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-sub">
                        Assignment status
                      </span>
                      <Select
                        value={fields.status}
                        disabled={!writable}
                        onChange={(event) =>
                          updateFields(project.id, {
                            status: event.target.value as ProjectMemberStatus,
                          })
                        }
                      >
                        {PROJECT_MEMBER_STATUSES.filter(
                          (status) => status !== "ENDED",
                        ).map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="space-y-1">
                      <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.5px] text-sub">
                        <CalendarDays size={12} /> Start date
                      </span>
                      <Input
                        type="date"
                        value={fields.startsOn}
                        disabled={!writable}
                        onChange={(event) =>
                          updateFields(project.id, {
                            startsOn: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.5px] text-sub">
                        <CalendarDays size={12} /> End date
                      </span>
                      <Input
                        type="date"
                        min={fields.startsOn || undefined}
                        value={fields.endsOn}
                        disabled={!writable}
                        onChange={(event) =>
                          updateFields(project.id, {
                            endsOn: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                  {fields.permissionMode === "CUSTOM" ? (
                    <div className="mt-4 rounded-inner border border-hairline bg-sunken/30 p-3">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[12px] font-semibold text-body">
                            Permission matrix
                          </p>
                          <p className="text-[11px] text-sub">
                            Limited by the member&apos;s organization role.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setPermissionPreset(project.id, "VIEW")}
                          >
                            View preset
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setPermissionPreset(project.id, "MANAGE")}
                          >
                            Manage preset
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        {PROJECT_PERMISSION_GROUPS.map((group) => {
                          const permissions = group.permissions.filter((permission) =>
                            rolePermissions.includes(permission),
                          );
                          if (!permissions.length) return null;
                          return (
                            <div key={group.key} className="space-y-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-sub">
                                {group.label}
                              </p>
                              {permissions.map((permission) => (
                                <label key={permission} className="flex items-center gap-2 text-[12px] text-body">
                                  <Checkbox
                                    checked={fields.permissions.includes(permission)}
                                    onChange={(event) =>
                                      togglePermission(
                                        project.id,
                                        permission,
                                        event.currentTarget.checked,
                                      )
                                    }
                                  />
                                  <span>{permission.split(":")[1].replaceAll("-", " ")}</span>
                                </label>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                      {!fields.permissions.includes("projects:read") ? (
                        <p className="mt-3 text-[11px] text-red-600">
                          Active custom access requires Project read permission.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </section>
        ) : (
          <div className="rounded-inner border border-dashed border-hairline p-6 text-center text-[12px] text-sub">
            Select at least one project to create assignments. Saving with no
            projects will end the member&apos;s current writable assignments.
          </div>
        )}

        {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
      </div>
    </Dialog>
  );
}
