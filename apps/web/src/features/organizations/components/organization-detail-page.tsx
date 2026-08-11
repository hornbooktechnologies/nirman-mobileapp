"use client";

import { useRouter } from "next/navigation";
import { Check, RefreshCw } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import {
  OPERATING_PROFILES_BY_ORGANIZATION_TYPE,
  ORGANIZATION_MEMBER_STATUSES,
  ORGANIZATION_STATUSES,
  type OperatingProfile,
  type OrganizationMemberStatus,
  type OrganizationStatus,
} from "@nirman-app/shared";
import { Button, Card, Checkbox, Input, PageHeader, Select, StatusBadge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import {
  useDeactivateOrganizationMember,
  useOrganization,
  useOrganizationMembers,
  useSwitchOrganization,
  useUpdateOrganization,
  useUpdateOrganizationMember,
} from "@/features/organizations/hooks/use-organizations";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import { useAuth } from "@/features/auth/hooks/use-auth";

const orgStatusTone = {
  ACTIVE: "active",
  DRAFT: "pending",
  SUSPENDED: "warning",
  ARCHIVED: "inactive",
} as const;

const memberStatusTone = {
  ACTIVE: "active",
  INVITED: "pending",
  INACTIVE: "inactive",
  SUSPENDED: "warning",
  LEFT: "inactive",
} as const;

export function OrganizationDetailPage({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const organization = useOrganization(organizationId);
  const members = useOrganizationMembers(organizationId);
  const updateOrganization = useUpdateOrganization(organizationId);
  const switchOrganization = useSwitchOrganization();
  const updateMember = useUpdateOrganizationMember(organizationId);
  const deactivateMember = useDeactivateOrganizationMember(organizationId);
  const [form, setForm] = useState({
    name: "",
    status: "ACTIVE" as OrganizationStatus,
    operatingProfile: "CUSTOM" as OperatingProfile,
    timezone: "Asia/Kolkata",
    currency: "INR",
  });
  const canSwitchOrganization = hasPermission("organizations:read");
  const canManageMembers = hasPermission("members:update");
  const canChangeStatus =
    hasPermission("organizations:activate") ||
    hasPermission("organizations:deactivate") ||
    hasPermission("platform-organizations:activate") ||
    hasPermission("platform-organizations:suspend");
  const allowedOperatingProfiles: readonly OperatingProfile[] =
    OPERATING_PROFILES_BY_ORGANIZATION_TYPE[
      organization.data?.type ?? "BUILDER"
    ];
  const hasCompatibleOperatingProfile = allowedOperatingProfiles.includes(
    form.operatingProfile,
  );

  useEffect(() => {
    if (!organization.data) return;
    setForm({
      name: organization.data.name,
      status: organization.data.status,
      operatingProfile: organization.data.operatingProfile,
      timezone: organization.data.timezone,
      currency: organization.data.currency,
    });
  }, [organization.data]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await updateOrganization.mutateAsync(form);
  }

  return (
    <PermissionGuard anyOf={["platform-organizations:read", "organizations:read"]}>
      <div className="space-y-4">
        <PageHeader
          title={organization.data?.name ?? "Organization"}
          description="Review organization setup and manage member access."
          onBack={() => router.push("/organizations")}
          actions={canSwitchOrganization ? (
            <Button
              variant="outline"
              onClick={() => switchOrganization.mutate(organizationId)}
              disabled={switchOrganization.isPending}
            >
              <RefreshCw size={16} />
              {switchOrganization.isPending ? "Switching" : "Switch"}
            </Button>
          ) : undefined}
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card>
            {organization.isLoading ? (
              <p className="text-[13px] text-body">Loading organization</p>
            ) : organization.isError ? (
              <p className="text-[13px] text-red-600">Unable to load organization</p>
            ) : (
              <PermissionGuard anyOf={["platform-organizations:update", "organizations:update"]}>
                <form className="grid gap-3" onSubmit={submit}>
                  <Input
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    required
                  />
                  <Select
                    value={form.status}
                    disabled={!canChangeStatus}
                    onChange={(event) =>
                      setForm({ ...form, status: event.target.value as OrganizationStatus })
                    }
                  >
                    {ORGANIZATION_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </Select>
                  <Select
                    value={form.operatingProfile}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        operatingProfile: event.target.value as OperatingProfile,
                      })
                    }
                  >
                    {!hasCompatibleOperatingProfile ? (
                      <option value={form.operatingProfile}>
                        {form.operatingProfile} (incompatible - choose a valid profile)
                      </option>
                    ) : null}
                    {allowedOperatingProfiles.map((profile) => (
                      <option key={profile} value={profile}>{profile}</option>
                    ))}
                  </Select>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={form.timezone}
                      onChange={(event) =>
                        setForm({ ...form, timezone: event.target.value })
                      }
                    />
                    <Input
                      value={form.currency}
                      maxLength={3}
                      onChange={(event) =>
                        setForm({ ...form, currency: event.target.value })
                      }
                    />
                  </div>
                  <Button type="submit" disabled={updateOrganization.isPending}>
                    <Check size={16} />
                    {updateOrganization.isPending ? "Saving" : "Save Organization"}
                  </Button>
                </form>
              </PermissionGuard>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-medium text-body">Members</h2>
                <p className="text-[13px] text-sub">Update member status and project scope.</p>
              </div>
              {organization.data ? (
                <StatusBadge tone={orgStatusTone[organization.data.status]}>
                  {organization.data.status}
                </StatusBadge>
              ) : null}
            </div>
            {members.isLoading ? (
              <p className="text-[13px] text-body">Loading members</p>
            ) : members.isError ? (
              <p className="text-[13px] text-red-600">Unable to load members</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>All Projects</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.data?.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="font-medium text-body">
                          {member.user?.name ?? member.userId}
                        </div>
                        <div className="text-[12px] text-sub">{member.user?.email}</div>
                      </TableCell>
                      <TableCell>{member.role?.name ?? "Role"}</TableCell>
                      <TableCell>
                        {canManageMembers ? (
                          <Select
                            value={member.status}
                            onChange={(event) =>
                              updateMember.mutate({
                                memberId: member.id,
                                input: {
                                  status: event.target.value as OrganizationMemberStatus,
                                },
                              })
                            }
                          >
                            {ORGANIZATION_MEMBER_STATUSES.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </Select>
                        ) : null}
                        <StatusBadge
                          className="mt-2"
                          tone={memberStatusTone[member.status]}
                        >
                          {member.status}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={member.organizationWideProjectAccess}
                          disabled={!canManageMembers}
                          onChange={(event) =>
                            updateMember.mutate({
                              memberId: member.id,
                              input: {
                                organizationWideProjectAccess: event.currentTarget.checked,
                              },
                            })
                          }
                          aria-label="Organization-wide project access"
                        />
                      </TableCell>
                      <TableCell>
                        {canManageMembers ? (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => deactivateMember.mutate(member.id)}
                            disabled={deactivateMember.isPending}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <span className="text-[12px] text-sub">View only</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      </div>
    </PermissionGuard>
  );
}
