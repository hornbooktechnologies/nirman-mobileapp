"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, UserMinus } from "lucide-react";
import {
  PROJECT_MEMBER_STATUSES,
  type PermissionKey,
  type ProjectMemberStatus,
  type ProjectPermissionMode,
  type ProjectStatus,
} from "@nirman-app/shared";
import { RowActionMenu } from "@/components/common/row-action-menu";
import {
  Badge,
  Button,
  Card,
  Dialog,
  Input,
  Select,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useOrganizationMemberRoles,
  useOrganizationMembers,
} from "@/features/organizations/hooks/use-organizations";
import { ProjectPermissionEditor } from "@/features/projects/components/project-permission-editor";
import {
  useAssignProjectMember,
  useProjectMembers,
  useUnassignProjectMember,
  useUpdateProjectMember,
} from "@/features/projects/hooks/use-projects";
import type { ProjectMember } from "@/features/projects/types/projects.types";

interface AssignmentForm {
  memberId: string;
  roleLabel: string;
  status: ProjectMemberStatus;
  startsOn: string;
  endsOn: string;
  permissionMode: ProjectPermissionMode;
  permissions: PermissionKey[];
}

const emptyForm: AssignmentForm = {
  memberId: "",
  roleLabel: "",
  status: "ACTIVE",
  startsOn: "",
  endsOn: "",
  permissionMode: "ROLE_DEFAULT",
  permissions: [],
};

export function ProjectMembersPanel({
  organizationId,
  projectId,
  projectStatus,
  effectivePermissions,
}: {
  organizationId: string | null;
  projectId: string;
  projectStatus: ProjectStatus;
  effectivePermissions?: PermissionKey[];
}) {
  const { hasPermission } = useAuth();
  const hasAccess = (permission: PermissionKey) =>
    effectivePermissions
      ? effectivePermissions.includes(permission)
      : hasPermission(permission);
  const canAssign = hasAccess("project-members:assign");
  const canUpdate = hasAccess("project-members:update");
  const canUnassign = hasAccess("project-members:unassign");
  const members = useProjectMembers(organizationId, projectId);
  const organizationMembers = useOrganizationMembers(organizationId ?? "", canAssign);
  const memberRoles = useOrganizationMemberRoles(
    organizationId ?? "",
    canAssign || canUpdate,
  );
  const assignMember = useAssignProjectMember(organizationId, projectId);
  const updateMember = useUpdateProjectMember(organizationId, projectId);
  const unassignMember = useUnassignProjectMember(organizationId, projectId);
  const projectMembers = useMemo(
    () => (Array.isArray(members.data) ? members.data : []),
    [members.data],
  );
  const assignedMemberIds = new Set(projectMembers.map((member) => member.memberId));
  const [search, setSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState<AssignmentForm>(emptyForm);
  const [editing, setEditing] = useState<ProjectMember | null>(null);
  const [editForm, setEditForm] = useState<AssignmentForm>(emptyForm);
  const [ending, setEnding] = useState<ProjectMember | null>(null);
  const [error, setError] = useState("");

  const visibleMembers = projectMembers.filter((member) => {
    const needle = search.trim().toLowerCase();
    return (
      !needle ||
      member.user.name.toLowerCase().includes(needle) ||
      member.user.email?.toLowerCase().includes(needle) ||
      member.role.name.toLowerCase().includes(needle)
    );
  });
  const selectedOrganizationMember = (organizationMembers.data ?? []).find(
    (member) => member.id === assignForm.memberId,
  );
  const availableOrganizationMembers = (organizationMembers.data ?? []).filter(
    (member) => member.status === "ACTIVE" && !assignedMemberIds.has(member.id),
  );
  const filteredOrganizationMembers = availableOrganizationMembers.filter((member) => {
    const needle = memberSearch.trim().toLowerCase();
    if (!needle) return true;
    return [
      member.user?.name,
      member.user?.email,
      member.user?.phone,
      member.role?.name,
      member.designation,
    ].some((value) => value?.toLowerCase().includes(needle));
  });
  const rolePermissions = (roleId?: string) =>
    memberRoles.data?.find((role) => role.id === roleId)?.permissions ?? [];

  function closeAssign() {
    setShowAssign(false);
    setAssignForm(emptyForm);
    setMemberSearch("");
    setError("");
  }

  async function assign() {
    setError("");
    try {
      await assignMember.mutateAsync({
        memberId: assignForm.memberId,
        input: {
          roleLabel: assignForm.roleLabel.trim() || null,
          status: assignForm.status,
          startsOn: assignForm.startsOn || null,
          endsOn: assignForm.endsOn || null,
          permissionMode: assignForm.permissionMode,
          permissions:
            assignForm.permissionMode === "CUSTOM" ? assignForm.permissions : [],
        },
      });
      closeAssign();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Unable to assign member");
    }
  }

  function openEdit(member: ProjectMember) {
    setError("");
    setEditing(member);
    setEditForm({
      memberId: member.memberId,
      roleLabel: member.roleLabel ?? "",
      status: member.status,
      startsOn: member.startsOn?.slice(0, 10) ?? "",
      endsOn: member.endsOn?.slice(0, 10) ?? "",
      permissionMode: member.permissionMode,
      permissions: member.grantedPermissions,
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setError("");
    try {
      await updateMember.mutateAsync({
        memberId: editing.memberId,
        input: {
          roleLabel: editForm.roleLabel.trim() || null,
          status: editForm.status,
          startsOn: editForm.startsOn || null,
          endsOn: editForm.endsOn || null,
          permissionMode: editForm.permissionMode,
          permissions: editForm.permissionMode === "CUSTOM" ? editForm.permissions : [],
        },
      });
      setEditing(null);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update member");
    }
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-medium text-body">Project Members</h2>
          <p className="text-[13px] text-sub">
            Login members, responsibilities, dates, and Project-specific permissions.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Input
            className="w-full sm:w-64"
            placeholder="Search assigned team"
            aria-label="Search assigned team"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {canAssign ? (
            <Button onClick={() => setShowAssign(true)}>
              <Plus size={16} /> Assign Member
            </Button>
          ) : null}
        </div>
      </div>

      {members.isLoading ? (
        <p className="text-[13px] text-body">Loading project members</p>
      ) : members.isError ? (
        <p className="text-[13px] text-red-600">Unable to load project members</p>
      ) : projectMembers.length === 0 ? (
        <p className="text-[13px] text-body">
          No members are assigned yet. Use Assign Member to build this Project team.
        </p>
      ) : visibleMembers.length === 0 ? (
        <p className="text-[13px] text-body">No assigned team members match this search.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Organization Role</TableHead>
              <TableHead>Project Responsibility</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="font-medium text-body">{member.user.name}</div>
                  <div className="text-[12px] text-sub">{member.user.email}</div>
                </TableCell>
                <TableCell>{member.role.name}</TableCell>
                <TableCell>{member.roleLabel ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant={member.permissionMode === "CUSTOM" ? "info" : "outline"}>
                    {member.permissionMode === "CUSTOM"
                      ? `${member.grantedPermissions.length} custom`
                      : "Role default"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <StatusBadge tone={member.status === "ACTIVE" ? "active" : "inactive"}>
                    {member.status}
                  </StatusBadge>
                </TableCell>
                <TableCell>
                  <RowActionMenu
                    actions={[
                      ...(canUpdate
                        ? [{ label: "Edit assignment", icon: <Pencil size={15} />, onSelect: () => openEdit(member) }]
                        : []),
                      ...(canUnassign
                        ? [{ label: "End assignment", icon: <UserMinus size={15} />, destructive: true, onSelect: () => setEnding(member) }]
                        : []),
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {showAssign ? (
        <Dialog
          open
          title="Assign Project Member"
          description="Select an active organization member and define this Project's responsibility and permissions."
          className="max-w-3xl"
          onOpenChange={(open) => {
            if (!open) {
              closeAssign();
            }
          }}
          footer={
            <>
              <Button variant="outline" onClick={closeAssign}>Cancel</Button>
              <Button disabled={!assignForm.memberId || assignMember.isPending} onClick={assign}>Assign Member</Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-sub">
                  Find organization member
                </span>
                <Input
                  type="search"
                  placeholder="Search by name, email, mobile, role or designation"
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                />
              </label>
              <p className="text-[11px] text-sub">
                {availableOrganizationMembers.length} available · {projectMembers.length} already assigned
              </p>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-inner border border-hairline bg-sunken/30 p-2">
                {organizationMembers.isLoading ? (
                  <p className="p-2 text-[12px] text-sub">Loading organization members</p>
                ) : filteredOrganizationMembers.length ? (
                  filteredOrganizationMembers.map((member) => {
                    const selected = member.id === assignForm.memberId;
                    return (
                      <button
                        key={member.id}
                        type="button"
                        aria-pressed={selected}
                        className={`flex min-h-11 w-full items-center justify-between rounded-inner border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/40 ${
                          selected
                            ? "border-lime bg-lime/10"
                            : "border-hairline bg-surface hover:bg-sunken"
                        }`}
                        onClick={() =>
                          setAssignForm({
                            ...assignForm,
                            memberId: member.id,
                            permissionMode: "ROLE_DEFAULT",
                            permissions: [],
                          })
                        }
                      >
                        <span>
                          <span className="block text-[12px] font-semibold text-body">
                            {member.user?.name ?? member.userId}
                          </span>
                          <span className="block text-[11px] text-sub">
                            {[member.role?.name, member.designation, member.user?.email]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        <span className="text-[11px] font-semibold text-sub">
                          {selected ? "Selected" : "Select"}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="p-2 text-[12px] text-sub">
                    No available organization members match this search.
                  </p>
                )}
              </div>
              {projectMembers.length ? (
                <details className="text-[11px] text-sub">
                  <summary className="cursor-pointer font-semibold text-body">
                    View already assigned members
                  </summary>
                  <p className="mt-1">
                    {projectMembers.map((member) => member.user.name).join(", ")}
                  </p>
                </details>
              ) : null}
            </div>
            {selectedOrganizationMember ? (
              <>
                <AssignmentDetails
                  form={assignForm}
                  setForm={setAssignForm}
                  projectStatus={projectStatus}
                />
                <ProjectPermissionEditor
                  mode={assignForm.permissionMode}
                  permissions={assignForm.permissions}
                  rolePermissions={rolePermissions(selectedOrganizationMember.roleId)}
                  memberName={selectedOrganizationMember.user?.name}
                  organizationRoleName={selectedOrganizationMember.role?.name}
                  assignmentStatus={assignForm.status}
                  onChange={({ mode, permissions }) => setAssignForm({ ...assignForm, permissionMode: mode, permissions })}
                />
              </>
            ) : (
              <p className="rounded-inner border border-hairline bg-sunken/40 p-3 text-[12px] text-sub">
                Select an organization member to configure responsibility, dates and
                Project permissions.
              </p>
            )}
            {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
          </div>
        </Dialog>
      ) : null}

      {editing ? (
        <Dialog
          open
          title={`Edit ${editing.user.name}`}
          description="Update this Project assignment without changing the Organization Role."
          className="max-w-3xl"
          onOpenChange={(open) => !open && setEditing(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={updateMember.isPending} onClick={saveEdit}>Save Assignment</Button>
            </>
          }
        >
          <div className="space-y-4">
            <AssignmentDetails
              form={editForm}
              setForm={setEditForm}
              projectStatus={projectStatus}
            />
            <ProjectPermissionEditor
              mode={editForm.permissionMode}
              permissions={editForm.permissions}
              rolePermissions={rolePermissions(editing.role.id)}
              memberName={editing.user.name}
              organizationRoleName={editing.role.name}
              assignmentStatus={editForm.status}
              onChange={({ mode, permissions }) => setEditForm({ ...editForm, permissionMode: mode, permissions })}
            />
            {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
          </div>
        </Dialog>
      ) : null}

      {ending ? (
        <Dialog
          open
          title={`End ${ending.user.name}'s assignment?`}
          description="This removes access to this Project only. Their Organization membership remains active."
          onOpenChange={(open) => !open && setEnding(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setEnding(null)}>Cancel</Button>
              <Button variant="danger" disabled={unassignMember.isPending} onClick={async () => { await unassignMember.mutateAsync(ending.memberId); setEnding(null); }}>End Assignment</Button>
            </>
          }
        >
          <div />
        </Dialog>
      ) : null}
    </Card>
  );
}

function AssignmentDetails({
  form,
  setForm,
  projectStatus,
}: {
  form: AssignmentForm;
  setForm: (form: AssignmentForm) => void;
  projectStatus: ProjectStatus;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-sub">Project responsibility</span>
        <Input placeholder="e.g. Site operations" value={form.roleLabel} onChange={(event) => setForm({ ...form, roleLabel: event.target.value })} />
      </label>
      <label className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-sub">Assignment status</span>
        <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProjectMemberStatus })}>
          {PROJECT_MEMBER_STATUSES.filter((status) => status !== "ENDED").map((status) => (
            <option key={status} value={status}>
              {status === "ACTIVE" ? "Active - access allowed" : "Inactive - no access"}
            </option>
          ))}
        </Select>
      </label>
      <label className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-sub">
          Start date
        </span>
        <Input type="date" value={form.startsOn} onChange={(event) => setForm({ ...form, startsOn: event.target.value })} />
      </label>
      <label className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-sub">
          End date
        </span>
        <Input type="date" min={form.startsOn || undefined} value={form.endsOn} onChange={(event) => setForm({ ...form, endsOn: event.target.value })} />
      </label>
      {projectStatus === "DRAFT" && form.status === "ACTIVE" ? (
        <p className="rounded-inner border border-amber-300 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900 md:col-span-2">
          This Project is still Draft. An Active assignment gives the member access as soon
          as the start date arrives. Choose Inactive if you are planning the team but do not
          want to grant access yet.
        </p>
      ) : null}
    </div>
  );
}
