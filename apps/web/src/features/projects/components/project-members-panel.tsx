"use client";

import { useState } from "react";
import {
  PROJECT_MEMBER_STATUSES,
  type ProjectMemberStatus,
} from "@nirman-app/shared";
import { Button, Card, Input, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import { useOrganizationMembers } from "@/features/organizations/hooks/use-organizations";
import {
  useAssignProjectMember,
  useProjectMembers,
  useUnassignProjectMember,
  useUpdateProjectMember,
} from "@/features/projects/hooks/use-projects";

export function ProjectMembersPanel({
  organizationId,
  projectId,
}: {
  organizationId: string | null;
  projectId: string;
}) {
  const members = useProjectMembers(organizationId, projectId);
  const organizationMembers = useOrganizationMembers(organizationId ?? "");
  const assignMember = useAssignProjectMember(organizationId, projectId);
  const updateMember = useUpdateProjectMember(organizationId, projectId);
  const unassignMember = useUnassignProjectMember(organizationId, projectId);
  const organizationMemberRows = Array.isArray(organizationMembers.data)
    ? organizationMembers.data
    : [];
  const projectMemberRows = Array.isArray(members.data) ? members.data : [];
  const [assignForm, setAssignForm] = useState({
    memberId: "",
    roleLabel: "",
    status: "ACTIVE" as ProjectMemberStatus,
    startsOn: "",
    endsOn: "",
  });

  async function assign() {
    await assignMember.mutateAsync({
      memberId: assignForm.memberId,
      input: {
        roleLabel: assignForm.roleLabel || null,
        status: assignForm.status,
        startsOn: assignForm.startsOn || null,
        endsOn: assignForm.endsOn || null,
      },
    });
    setAssignForm({
      memberId: "",
      roleLabel: "",
      status: "ACTIVE",
      startsOn: "",
      endsOn: "",
    });
  }

  return (
    <Card>
      <div className="mb-3">
        <h2 className="text-[18px] font-medium text-body">Project Members</h2>
        <p className="text-[13px] text-sub">Assign active organization members.</p>
      </div>

      <PermissionGuard permission="project-members:assign">
        <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_150px_150px_auto]">
          <Select
            value={assignForm.memberId}
            onChange={(event) =>
              setAssignForm({ ...assignForm, memberId: event.target.value })
            }
          >
            <option value="">Select member</option>
            {organizationMemberRows
              .filter((member) => member.status === "ACTIVE")
              .map((member) => (
                <option key={member.id} value={member.id}>
                  {member.user?.name ?? member.userId}
                </option>
              ))}
          </Select>
          <Input
            placeholder="Role label"
            value={assignForm.roleLabel}
            onChange={(event) =>
              setAssignForm({ ...assignForm, roleLabel: event.target.value })
            }
          />
          <Input
            type="date"
            value={assignForm.startsOn}
            onChange={(event) =>
              setAssignForm({ ...assignForm, startsOn: event.target.value })
            }
          />
          <Input
            type="date"
            value={assignForm.endsOn}
            onChange={(event) =>
              setAssignForm({ ...assignForm, endsOn: event.target.value })
            }
          />
          <Button
            onClick={assign}
            disabled={!assignForm.memberId || assignMember.isPending}
          >
            Assign
          </Button>
        </div>
      </PermissionGuard>

      {members.isLoading ? (
        <p className="text-[13px] text-body">Loading project members</p>
      ) : members.isError ? (
        <p className="text-[13px] text-red-600">Unable to load project members</p>
      ) : projectMemberRows.length === 0 ? (
        <p className="text-[13px] text-body">No members are assigned to this project.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role Label</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projectMemberRows.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="font-medium text-body">{member.user.name}</div>
                  <div className="text-[12px] text-sub">{member.user.email}</div>
                </TableCell>
                <TableCell>
                  <Input
                    value={member.roleLabel ?? ""}
                    onChange={(event) =>
                      updateMember.mutate({
                        memberId: member.memberId,
                        input: { roleLabel: event.target.value || null },
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={member.status}
                    onChange={(event) =>
                      updateMember.mutate({
                        memberId: member.memberId,
                        input: { status: event.target.value as ProjectMemberStatus },
                      })
                    }
                  >
                    {PROJECT_MEMBER_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="text-[12px] text-body">
                    {member.startsOn ?? "-"} to {member.endsOn ?? "-"}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => unassignMember.mutate(member.memberId)}
                    disabled={unassignMember.isPending}
                  >
                    Unassign
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
