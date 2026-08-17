"use client";

import { useState, type FormEvent } from "react";
import {
  FolderKanban,
  Pencil,
  Plus,
  UserPlus,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import {
  Button,
  Card,
  Checkbox,
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
  Badge,
} from "@/components/ui";
import { RowActionMenu } from "@/components/common/row-action-menu";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { MemberProjectAssignmentDialog } from "@/features/members/components/member-project-assignment-dialog";
import {
  useDeactivateOrganizationMember,
  useInviteOrganizationMember,
  useOrganizationMemberRoles,
  useOrganizationMembers,
  useUpdateOrganizationMember,
} from "@/features/organizations/hooks/use-organizations";
import type {
  OrganizationMember,
  OrganizationMemberInvitationResponse,
} from "@/features/organizations/types/organizations.types";
import { useOrganizationProjectAssignments } from "@/features/projects/hooks/use-projects";
import { ApiError } from "@/lib/api/api-client";

const memberStatusTone = {
  ACTIVE: "active",
  INVITED: "pending",
  INACTIVE: "inactive",
  SUSPENDED: "warning",
  LEFT: "inactive",
} as const;

export function OrganizationMembersPanel({
  organizationId,
}: {
  organizationId: string;
}) {
  const { hasPermission, user } = useAuth();
  const canInviteMembers = hasPermission("members:invite");
  const canUpdateMembers = hasPermission("members:update");
  const canDeactivateMembers = hasPermission("members:deactivate");
  const canViewProjectAssignments =
    hasPermission("project-members:read") &&
    hasPermission("project-members:view-all");
  const canManageProjectAssignments =
    canViewProjectAssignments &&
    hasPermission("projects:assign") &&
    hasPermission("project-members:assign") &&
    hasPermission("project-members:update") &&
    hasPermission("project-members:unassign");
  const members = useOrganizationMembers(organizationId);
  const projectOverview = useOrganizationProjectAssignments(
    organizationId,
    canViewProjectAssignments,
  );
  const updateMember = useUpdateOrganizationMember(organizationId);
  const deactivateMember = useDeactivateOrganizationMember(organizationId);
  const memberRoles = useOrganizationMemberRoles(
    organizationId,
    canInviteMembers || canUpdateMembers,
  );
  const inviteMember = useInviteOrganizationMember(organizationId);
  const [isInvitingMember, setIsInvitingMember] = useState(false);
  const [assignmentMember, setAssignmentMember] =
    useState<OrganizationMember | null>(null);
  const [editingMember, setEditingMember] =
    useState<OrganizationMember | null>(null);
  const [deactivatingMember, setDeactivatingMember] =
    useState<OrganizationMember | null>(null);
  const [editForm, setEditForm] = useState({
    roleId: "",
    designation: "",
    organizationWideProjectAccess: false,
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    phone: "",
    roleId: "",
    designation: "",
    organizationWideProjectAccess: false,
  });
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [memberInvitation, setMemberInvitation] =
    useState<OrganizationMemberInvitationResponse | null>(null);
  const [copiedInvitationLink, setCopiedInvitationLink] = useState(false);

  async function submitMemberInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteError(null);
    try {
      const result = await inviteMember.mutateAsync({
        ...inviteForm,
        phone: inviteForm.phone || undefined,
        designation: inviteForm.designation || undefined,
      });
      setMemberInvitation(result);
      setInviteForm({
        name: "",
        email: "",
        phone: "",
        roleId: "",
        designation: "",
        organizationWideProjectAccess: false,
      });
      setIsInvitingMember(false);
    } catch (error) {
      setInviteError(
        error instanceof ApiError ? error.message : "Unable to invite member",
      );
    }
  }

  async function copyMemberInvitationLink() {
    if (!memberInvitation) return;
    await navigator.clipboard.writeText(
      memberInvitation.invitation.activationUrl,
    );
    setCopiedInvitationLink(true);
  }

  function openEditMember(member: OrganizationMember) {
    setEditError(null);
    setEditForm({
      roleId: member.roleId,
      designation: member.designation ?? "",
      organizationWideProjectAccess: member.organizationWideProjectAccess,
    });
    setEditingMember(member);
  }

  async function saveEditedMember() {
    if (!editingMember) return;
    setEditError(null);
    try {
      await updateMember.mutateAsync({
        memberId: editingMember.id,
        input: {
          ...(editingMember.userId === user?.id
            ? {}
            : { roleId: editForm.roleId }),
          designation: editForm.designation.trim() || null,
          organizationWideProjectAccess:
            editForm.organizationWideProjectAccess,
        },
      });
      setEditingMember(null);
    } catch (error) {
      setEditError(
        error instanceof ApiError ? error.message : "Unable to update member",
      );
    }
  }

  async function activateMember(member: OrganizationMember) {
    setActionError(null);
    try {
      await updateMember.mutateAsync({
        memberId: member.id,
        input: { status: "ACTIVE" },
      });
    } catch (error) {
      setActionError(
        error instanceof ApiError ? error.message : "Unable to activate member",
      );
    }
  }

  async function deactivate(member: OrganizationMember) {
    setActionError(null);
    try {
      await deactivateMember.mutateAsync(member.id);
      setDeactivatingMember(null);
    } catch (error) {
      setActionError(
        error instanceof ApiError
          ? error.message
          : "Unable to deactivate member",
      );
    }
  }

  return (
    <>
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-medium text-body">
              Organization Members
            </h2>
            <p className="text-[13px] text-sub">
              Everyone in the organization is listed here, including members
              who have not yet been assigned to a project.
            </p>
          </div>
          {canInviteMembers ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setIsInvitingMember((current) => !current)}
            >
              <UserPlus size={15} />
              {isInvitingMember ? "Close" : "Invite Member"}
            </Button>
          ) : null}
        </div>

        {memberInvitation ? (
          <div className="mb-4 rounded-inner border border-lime/50 bg-lime/5 p-3">
            <p className="text-[13px] font-medium text-body">
              Member invitation created
            </p>
            <p className="mt-1 text-[12px] text-sub">
              Delivery: {memberInvitation.invitation.deliveryStatus}. The
              invitation expires{" "}
              {new Date(
                memberInvitation.invitation.expiresAt,
              ).toLocaleString()}
              .
            </p>
            <p className="mt-2 break-all text-[12px] text-body">
              {memberInvitation.invitation.activationUrl}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={copyMemberInvitationLink}
            >
              {copiedInvitationLink ? "Copied Link" : "Copy Activation Link"}
            </Button>
          </div>
        ) : null}

        {isInvitingMember && canInviteMembers ? (
          <form
            className="mb-4 grid gap-3 rounded-inner border border-hairline bg-canvas p-3 md:grid-cols-2"
            onSubmit={submitMemberInvitation}
          >
            <Input
              placeholder="Member name"
              value={inviteForm.name}
              onChange={(event) =>
                setInviteForm({ ...inviteForm, name: event.target.value })
              }
              required
            />
            <Input
              type="email"
              placeholder="Login email"
              value={inviteForm.email}
              onChange={(event) =>
                setInviteForm({ ...inviteForm, email: event.target.value })
              }
              required
            />
            <Input
              placeholder="Mobile number (optional)"
              value={inviteForm.phone}
              onChange={(event) =>
                setInviteForm({ ...inviteForm, phone: event.target.value })
              }
            />
            <Select
              value={inviteForm.roleId}
              onChange={(event) =>
                setInviteForm({ ...inviteForm, roleId: event.target.value })
              }
              required
            >
              <option value="">Select organization role</option>
              {memberRoles.data?.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Designation (optional)"
              value={inviteForm.designation}
              onChange={(event) =>
                setInviteForm({
                  ...inviteForm,
                  designation: event.target.value,
                })
              }
            />
            <Checkbox
              label="Access all organization projects"
              checked={inviteForm.organizationWideProjectAccess}
              onChange={(event) =>
                setInviteForm({
                  ...inviteForm,
                  organizationWideProjectAccess: event.currentTarget.checked,
                })
              }
            />
            {inviteError ? (
              <p className="text-[13px] text-red-600 md:col-span-2">
                {inviteError}
              </p>
            ) : null}
            <div className="md:col-span-2">
              <Button type="submit" disabled={inviteMember.isPending}>
                {inviteMember.isPending ? "Inviting" : "Send Invitation"}
              </Button>
            </div>
          </form>
        ) : null}

        {actionError ? (
          <p className="mb-3 text-[13px] text-red-600">{actionError}</p>
        ) : null}

        {members.isLoading ? (
          <p className="text-[13px] text-body">Loading organization members</p>
        ) : members.isError ? (
          <p className="text-[13px] text-red-600">
            Unable to load organization members
          </p>
        ) : !members.data?.length ? (
          <p className="text-[13px] text-body">
            No organization members are available yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Organization Role</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Project Access</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.data.map((member) => {
                const assignments =
                  projectOverview.data?.assignments.filter(
                    (assignment) => assignment.memberId === member.id,
                  ) ?? [];
                const canAssignThisMember =
                  canManageProjectAssignments &&
                  Boolean(projectOverview.data) &&
                  member.status === "ACTIVE" &&
                  !member.organizationWideProjectAccess;
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="font-medium text-body">
                        {member.user?.name ?? member.userId}
                      </div>
                      <div className="text-[12px] text-sub">
                        {member.user?.email}
                      </div>
                    </TableCell>
                    <TableCell>{member.role?.name ?? "Role"}</TableCell>
                    <TableCell>{member.designation ?? "-"}</TableCell>
                    <TableCell>
                      {member.organizationWideProjectAccess ? (
                        <Badge variant="info">All projects</Badge>
                      ) : projectOverview.isLoading ? (
                        <span className="text-[12px] text-sub">
                          Loading access
                        </span>
                      ) : assignments.length > 0 ? (
                        <div className="flex max-w-[320px] flex-wrap gap-1.5">
                          {assignments.slice(0, 2).map((assignment) => (
                            <Badge key={assignment.id} variant="outline">
                              {assignment.project.name}
                            </Badge>
                          ))}
                          {assignments.length > 2 ? (
                            <Badge variant="default">
                              +{assignments.length - 2} more
                            </Badge>
                          ) : null}
                        </div>
                      ) : canAssignThisMember ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAssignmentMember(member)}
                        >
                          <Plus size={14} />
                          Unassigned · Assign
                        </Button>
                      ) : (
                        <Badge variant="warning">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={memberStatusTone[member.status]}>
                        {member.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <RowActionMenu
                        actions={[
                          ...(canUpdateMembers
                            ? [
                                {
                                  label: "Edit member",
                                  icon: <Pencil size={15} />,
                                  onSelect: () => openEditMember(member),
                                },
                              ]
                            : []),
                          ...(canAssignThisMember
                            ? [
                                {
                                  label:
                                    assignments.length > 0
                                      ? "Manage projects"
                                      : "Assign projects",
                                  icon: <FolderKanban size={15} />,
                                  onSelect: () => setAssignmentMember(member),
                                },
                              ]
                            : []),
                          ...(canDeactivateMembers && member.status === "ACTIVE"
                            ? [
                                {
                                  label: "Deactivate member",
                                  icon: <UserRoundX size={15} />,
                                  destructive: true,
                                  disabled: deactivateMember.isPending,
                                  onSelect: () => {
                                    setActionError(null);
                                    setDeactivatingMember(member);
                                  },
                                },
                              ]
                            : []),
                          ...(canUpdateMembers &&
                          ["INACTIVE", "SUSPENDED"].includes(member.status)
                            ? [
                                {
                                  label: "Activate member",
                                  icon: <UserRoundCheck size={15} />,
                                  disabled: updateMember.isPending,
                                  onSelect: () => void activateMember(member),
                                },
                              ]
                            : []),
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {projectOverview.isError && canViewProjectAssignments ? (
          <p className="mt-3 text-[12px] text-red-600">
            Member project assignments could not be loaded. Organization
            members are still shown.
          </p>
        ) : null}
      </Card>

      {editingMember ? (
        <Dialog
          open
          title={`Edit ${editingMember.user?.name ?? "member"}`}
          description="Update the member's organization role, designation and project scope."
          onOpenChange={(open) => {
            if (!open) setEditingMember(null);
          }}
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setEditingMember(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={saveEditedMember}
                disabled={updateMember.isPending}
              >
                {updateMember.isPending ? "Saving" : "Save Member"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-sub">
                Organization role
              </span>
              <Select
                value={editForm.roleId}
                disabled={editingMember.userId === user?.id}
                onChange={(event) =>
                  setEditForm({ ...editForm, roleId: event.target.value })
                }
              >
                {memberRoles.data?.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </Select>
              <p className="text-[11px] text-sub">
                Organization role controls permissions.
                {editingMember.userId === user?.id
                  ? " You cannot change your own role."
                  : ""}
              </p>
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-sub">
                Designation
              </span>
              <Input
                placeholder="Optional job title"
                value={editForm.designation}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    designation: event.target.value,
                  })
                }
              />
            </label>
            <div className="rounded-inner border border-hairline bg-sunken/40 p-3">
              <Checkbox
                label="Access all organization projects"
                checked={editForm.organizationWideProjectAccess}
                disabled={editingMember.userId === user?.id}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    organizationWideProjectAccess: event.currentTarget.checked,
                  })
                }
              />
              <p className="mt-1 pl-6 text-[11px] text-sub">
                {editingMember.userId === user?.id
                  ? "You cannot change your own project scope from this screen."
                  : "Turn this off to manage selected projects individually from the Assign or Manage Projects action."}
              </p>
            </div>
            {editError ? (
              <p className="text-[13px] text-red-600">{editError}</p>
            ) : null}
          </div>
        </Dialog>
      ) : null}

      {assignmentMember && projectOverview.data ? (
        <MemberProjectAssignmentDialog
          key={`${assignmentMember.id}-${projectOverview.data.assignments
            .filter((assignment) => assignment.memberId === assignmentMember.id)
            .map((assignment) => assignment.updatedAt)
            .join("-")}`}
          organizationId={organizationId}
          member={assignmentMember}
          overview={projectOverview.data}
          rolePermissions={
            memberRoles.data?.find(
              (role) => role.id === assignmentMember.roleId,
            )?.permissions ?? []
          }
          onClose={() => setAssignmentMember(null)}
        />
      ) : null}

      {deactivatingMember ? (
        <Dialog
          open
          title={`Deactivate ${deactivatingMember.user?.name ?? "member"}?`}
          description="They will lose organization and project access until an authorized user activates them again."
          onOpenChange={(open) => {
            if (!open) setDeactivatingMember(null);
          }}
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setDeactivatingMember(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={deactivateMember.isPending}
                onClick={() => void deactivate(deactivatingMember)}
              >
                {deactivateMember.isPending ? "Deactivating" : "Deactivate"}
              </Button>
            </>
          }
        >
          <p className="text-[13px] leading-5 text-sub">
            Existing project assignments will be retained for history. They do
            not grant access while the organization membership is inactive.
          </p>
          {actionError ? (
            <p className="mt-3 text-[13px] text-red-600">{actionError}</p>
          ) : null}
        </Dialog>
      ) : null}
    </>
  );
}
