"use client";

import { useRouter } from "next/navigation";
import { Check, RefreshCw } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import {
  OPERATING_PROFILES_BY_ORGANIZATION_TYPE,
  ORGANIZATION_STATUSES,
  type OperatingProfile,
  type OrganizationStatus,
} from "@nirman-app/shared";
import {
  Button,
  Card,
  Input,
  PageHeader,
  Select,
  StatusBadge,
} from "@/components/ui";
import {
  useOrganization,
  useSwitchOrganization,
  useUpdateOrganization,
} from "@/features/organizations/hooks/use-organizations";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import { useAuth } from "@/features/auth/hooks/use-auth";

const orgStatusTone = {
  ACTIVE: "active",
  DRAFT: "pending",
  SUSPENDED: "warning",
  ARCHIVED: "inactive",
} as const;

export function OrganizationDetailPage({
  organizationId,
}: {
  organizationId: string;
}) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const organization = useOrganization(organizationId);
  const updateOrganization = useUpdateOrganization(organizationId);
  const switchOrganization = useSwitchOrganization();
  const [form, setForm] = useState({
    name: "",
    status: "ACTIVE" as OrganizationStatus,
    operatingProfile: "CUSTOM" as OperatingProfile,
    timezone: "Asia/Kolkata",
  });
  const canSwitchOrganization = hasPermission("organizations:read");
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
    });
  }, [organization.data]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await updateOrganization.mutateAsync(form);
  }

  return (
    <PermissionGuard
      anyOf={["platform-organizations:read", "organizations:read"]}
    >
      <div className="space-y-4">
        <PageHeader
          title={organization.data?.name ?? "Organization"}
          description="Review organization setup and workspace defaults."
          onBack={() => router.push("/organizations")}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {organization.data ? (
                <StatusBadge tone={orgStatusTone[organization.data.status]}>
                  {organization.data.status}
                </StatusBadge>
              ) : null}
              {canSwitchOrganization ? (
                <Button
                  variant="outline"
                  onClick={() => switchOrganization.mutate(organizationId)}
                  disabled={switchOrganization.isPending}
                >
                  <RefreshCw size={16} />
                  {switchOrganization.isPending ? "Switching" : "Switch"}
                </Button>
              ) : null}
            </div>
          }
        />

        <Card>
          {organization.isLoading ? (
            <p className="text-[13px] text-body">Loading organization</p>
          ) : organization.isError ? (
            <p className="text-[13px] text-red-600">
              Unable to load organization
            </p>
          ) : (
            <PermissionGuard
              anyOf={[
                "platform-organizations:update",
                "organizations:update",
              ]}
            >
              <form className="grid gap-3" onSubmit={submit}>
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                />
                <Select
                  value={form.status}
                  disabled={!canChangeStatus}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target.value as OrganizationStatus,
                    })
                  }
                >
                  {ORGANIZATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
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
                      {form.operatingProfile} (incompatible - choose a valid
                      profile)
                    </option>
                  ) : null}
                  {allowedOperatingProfiles.map((profile) => (
                    <option key={profile} value={profile}>
                      {profile}
                    </option>
                  ))}
                </Select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    value={form.timezone}
                    onChange={(event) =>
                      setForm({ ...form, timezone: event.target.value })
                    }
                  />
                  <div className="flex min-h-10 items-center rounded-sub border border-hairline bg-sunken px-3 text-[13px] text-body">
                    <span className="text-sub">Default currency:</span>
                    <strong className="ml-1.5 font-semibold">
                      {organization.data?.currency ?? "INR"}
                    </strong>
                  </div>
                </div>
                <Button type="submit" disabled={updateOrganization.isPending}>
                  <Check size={16} />
                  {updateOrganization.isPending
                    ? "Saving"
                    : "Save Organization"}
                </Button>
              </form>
            </PermissionGuard>
          )}
        </Card>
      </div>
    </PermissionGuard>
  );
}
